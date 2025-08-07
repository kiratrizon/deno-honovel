import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { IBaseModelProperties } from "../../../../../@types/declaration/Base/IBaseModel.d.ts";
import { DB, Hash } from "Illuminate/Support/Facades/index.ts";
import { AuthConfig } from "configs/@types/index.d.ts";
import { Carbon } from "honovel:helpers";

type AuthenticatableAttr = {
  id: number | string;
  password: string;
  rememberToken?: string | null;
};

type AuthenticatableAttrToken = AuthenticatableAttr & {
  api_token: string;
};
type AuthenticatableAttrSession = AuthenticatableAttr & {
  remember_token?: string | null;
};

// New attributes type that merges both
type WithAuthAttributes<T> = T extends { _attributes: infer A }
  ? A & AuthenticatableAttr
  : AuthenticatableAttr;

/**
 * Provides authentication-related logic for a model,
 * including identifier access and remember token management.
 */
export class Authenticatable<
  T extends IBaseModelProperties = { _attributes: AuthenticatableAttr }
> extends Model<T> {
  /**
   * Internal attributes, merged with authentication fields.
   */
  declare _attributes: WithAuthAttributes<T>;

  /**
   * The unique identifier of the user (usually "id").
   */
  declare id: AuthenticatableAttr["id"];

  /**
   * The hashed password of the user.
   */
  declare password: AuthenticatableAttr["password"];

  /**
   * Optional remember token for persistent login sessions.
   */
  declare rememberToken?: AuthenticatableAttr["rememberToken"];

  /**
   * Returns the name of the unique identifier field.
   * Typically "id".
   */
  getAuthIdentifierName(): string {
    return "id";
  }

  /**
   * Returns the value of the user's unique identifier.
   */
  getAuthIdentifier(): number | string {
    return this.id;
  }

  /**
   * Returns the user's hashed password.
   */
  getAuthPassword(): string {
    return this.password;
  }

  /**
   * Gets the user's current "remember me" token.
   */
  getRememberToken(): string | null {
    return this.rememberToken || null;
  }

  /**
   * Sets a new "remember me" token for the user.
   */
  setRememberToken(token: string): void {
    this.fill({
      rememberToken: token,
    });
  }

  /**
   * Returns the name of the "remember me" token field.
   */
  getRememberTokenName(): string {
    return "remember_token";
  }
}

export abstract class BaseGuard {
  protected model: typeof Authenticatable;
  protected readonly connection: string;
  constructor(protected c: MyContext, protected guardName: string) {
    BaseGuard.init();
    [this.model, this.connection] = BaseGuard.getModelFromGuard(guardName);
  }
  protected authUser: Authenticatable | null = null;

  protected rememberUser: boolean = false; // if "remember me" is checked

  protected static authConf: AuthConfig;
  public static init(): void {
    if (this.authConf) return; // Already initialized
    this.authConf = staticConfig("auth");
  }

  abstract attempt(
    // deno-lint-ignore no-explicit-any
    credentials: Record<string, any>,
    remember?: boolean
  ): Promise<boolean | string>;

  private static getModelFromGuard(
    guardName: string
  ): [typeof Authenticatable, string] {
    const providerName = this.authConf?.guards?.[guardName]?.provider;
    if (!providerName) {
      throw new Error(`Guard ${guardName} does not have a provider defined`);
    }
    const provider = this.authConf?.providers?.[providerName];
    if (!provider) {
      throw new Error(
        `Provider ${providerName} not found for guard ${guardName}`
      );
    }
    const model = provider.model;
    if (!model) {
      throw new Error(`Model not defined for provider ${providerName}`);
    }
    if (!(model.prototype instanceof Authenticatable)) {
      throw new Error(`Model ${model.name} does not extend Authenticatable`);
    }
    const connection = new model().getConnection();
    return [model as typeof Authenticatable, connection];
  }

  /**
   * Retrieves the currently authenticated user.
   * If no user is authenticated, returns null.
   */
  abstract user(): Authenticatable | null;

  /**
   * Checks if the user is authenticated.
   * Returns true if the user is authenticated, otherwise false.
   */
  abstract check(): Promise<boolean>;

  /**
   * Logs out the currently authenticated user.
   */
  abstract logout(): void;

  /**
   * Returns the authenticated user's primary key.
   */
  public id(): string | number | null {
    const user = this.user();
    return user ? user.getAuthIdentifier() : null;
  }

  /**
   * Indicates if the user was authenticated via "remember me".
   */
  abstract viaRemember(): boolean;

  /**
   * Returns the name of the guard.
   * For debugging purposes.
   */
  getGuardName(): string {
    return this.guardName;
  }

  protected async attemptManager(
    driver: string,
    // deno-lint-ignore no-explicit-any
    credentials: Record<string, any>,
    remember?: boolean
    // deno-lint-ignore no-explicit-any
  ): Promise<any> {
    const { request } = this.c.get("myHono");
    const sessguardKey = `auth_${this.guardName}_user`;
    const provider = TokenGuard.authConf?.guards?.[this.guardName]?.provider;
    const selectedProvider = TokenGuard.authConf?.providers?.[provider];
    if (!selectedProvider) {
      throw new Error(
        `Provider ${provider} not found for guard ${this.guardName}`
      );
    }
    const credentialKey = selectedProvider.credentialKey || "email";
    const passwordKey = selectedProvider.passwordKey || "password";
    if (
      !keyExist(credentials, credentialKey) ||
      !keyExist(credentials, passwordKey)
    ) {
      return false;
    }
    const user = (await this.model
      .on(this.connection)
      .where(credentialKey, credentials[credentialKey])
      .first()) as Authenticatable | null;
    if (!user) {
      return false;
    }
    if (Hash.check(credentials[passwordKey], user.getAuthPassword())) {
      this.authUser = user;
      const rawAttributes = user.getRawAttributes();

      if (driver === "token") {
        if (!keyExist(rawAttributes, "api_token")) {
          throw new Error(
            `Table ${new this.model().getTableName()} have no api_token column.`
          );
        }
        // @ts-ignore //
        return rawAttributes.api_token as string;
      } else if (driver === "session") {
        request.session.put(
          // @ts-ignore //
          sessguardKey,
          rawAttributes as AuthenticatableAttrSession
        );
        if (remember) {
          // If "remember me" is checked, set the remember token
          const generatedToken = `${this.guardName}_${user.id}_${strToTime(
            Carbon.now().addDays(30)
          )}`;
          const rememberToken = Hash.make(generatedToken);
          user.setRememberToken(rememberToken);
          await user.save();
          request.cookie(sessguardKey, rememberToken, {
            maxAge: 30 * 24 * 60 * 60, // 30 days
          });
          this.rememberUser = true;
        }
        return true;
      }
    }
    return false;
  }
}

export class JwtGuard extends BaseGuard {
  async check(): Promise<boolean> {
    // Implement JWT check logic
    return true; // Placeholder
  }

  async attempt(
    credentials: Record<string, any>,
    remember?: boolean
  ): Promise<boolean> {
    const keysAuth = JwtGuard.authConf?.guards?.[this.guardName];
    return true;
  }

  user(): Authenticatable | null {
    // Implement JWT user retrieval logic
    return null; // Placeholder
  }

  logout(): void {
    // Implement JWT logout logic
  }

  viaRemember(): boolean {
    return false; // Placeholder
  }
}

export class SessionGuard extends BaseGuard {
  async check(): Promise<boolean> {
    // Implement session check logic

    if (this.authUser) {
      // If user is already set in context, return true
      return true;
    }
    const { request } = this.c.get("myHono");
    const sessguardKey = `auth_${this.guardName}_user`;

    // @ts-ignore //
    const checkUser = request.session.get(sessguardKey) as Record<
      string,
      // deno-lint-ignore no-explicit-any
      any
    > | null;
    if (checkUser) {
      // If user is already set in context, return true
      this.authUser = new this.model(checkUser as AuthenticatableAttrSession);
      return true;
    }
    const rememberToken = request.cookie(sessguardKey);
    if (rememberToken) {
      const user = (await this.model
        .on(this.connection)
        .where("remember_token", rememberToken)
        .first()) as Authenticatable | null;
      if (user) {
        this.authUser = user;
        return true;
      }
    }
    return false; // Placeholder
  }

  async attempt(
    // deno-lint-ignore no-explicit-any
    credentials: Record<string, any>,
    remember?: boolean
  ): Promise<boolean> {
    return (await this.attemptManager(
      "session",
      credentials,
      remember
    )) as Promise<boolean>;
  }

  user(): Authenticatable | null {
    const { request } = this.c.get("myHono");
    const sessguardKey = `auth_${this.guardName}_user`;
    // @ts-ignore //
    return request.session.get(sessguardKey) as Authenticatable | null;
  }

  logout(): void {
    const { request } = this.c.get("myHono");
    const sessguardKey = `auth_${this.guardName}_user`;
    // @ts-ignore //
    request.session.forget(sessguardKey);
    request.cookie(sessguardKey, "", {
      maxAge: -1, // Delete the cookie
    });
    // @ts-ignore //
    this.c.set(sessguardKey, null);
  }

  viaRemember(): boolean {
    const { request } = this.c.get("myHono");
    const sessguardKey = `auth_${this.guardName}_user`;
    // @ts-ignore //
    const user = request.session.get(sessguardKey) as Authenticatable | null;
    return user ? !!user.rememberToken : false;
  }
}

export class TokenGuard extends BaseGuard {
  async check(): Promise<boolean> {
    const key = `auth_${this.guardName}_user`;
    // @ts-ignore //
    const checkUser = this.c.get(key) as Authenticatable | null;
    if (checkUser) {
      // If user is already set in context, return true
      return true;
    }
    // Implement token check logic
    const { request } = this.c.get("myHono");

    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!isset(token) || empty(token)) {
      return false;
    }

    const user = await this.model
      .on(this.connection)
      .where("api_token", token)
      .first();
    if (!user) {
      return false;
    }
    // @ts-ignore //
    this.c.set(key, user);
    return true; // Placeholder
  }

  // deno-lint-ignore no-explicit-any
  async attempt(credentials: Record<string, any>): Promise<string | false> {
    return (await this.attemptManager("token", credentials)) as Promise<
      string | false
    >;
  }

  user() {
    const key = `auth_${this.guardName}_user`;
    // @ts-ignore //
    return this.c.get(key) as Authenticatable | null;
  }

  logout() {
    const key = `auth_${this.guardName}_user`;
    // @ts-ignore //
    this.c.set(key, null);
    // Optionally, you can also delete the token from the database
  }

  viaRemember(): boolean {
    return this.rememberUser;
  }
}
