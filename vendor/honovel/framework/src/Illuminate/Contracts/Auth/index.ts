import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { DB, Hash } from "Illuminate/Support/Facades/index.ts";
import { AuthConfig } from "configs/@types/index.d.ts";
import { Carbon } from "helpers";
import { JWTAuth } from "../../Auth/index.ts";
import {
  AccessorMap,
  ModelAttributes,
} from "../../../../../@types/declaration/Base/IBaseModel.d.ts";

type AuthenticatableAttr = {
  password: string;
  remember_token?: string;
};

type AuthenticatableAttrToken = AuthenticatableAttr & {
  api_token: string;
};
type AuthenticatableAttrSession = AuthenticatableAttr & {
  remember_token?: string | null;
};

// New attributes type that merges both
type WithAuthAttributes<T> = AuthenticatableAttr & T;

/**
 * Provides authentication-related logic for a model,
 * including identifier access and remember token management.
 */
export abstract class Authenticatable<
  S extends ModelAttributes = ModelAttributes,
  T extends Record<string, unknown> = WithAuthAttributes<S>
> extends Model<T> {
  /**
   * The hashed password of the user.
   */
  declare password: AuthenticatableAttr["password"];

  /**
   * Optional remember token for persistent login sessions.
   */
  declare remember_token?: AuthenticatableAttr["remember_token"];

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
    // @ts-ignore //
    return this[this.getAuthIdentifierName()] || "";
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
    return this.remember_token || null;
  }

  /**
   * Sets a new "remember me" token for the user.
   */
  async setRememberToken(token: string): Promise<void> {
    // @ts-ignore //
    this.fill({ remember_token: token });
    // Save the model to persist the new token
    await this.save();
  }

  /**
   * Returns the name of the "remember me" token field.
   */
  getRememberTokenName(): string {
    return "remember_token";
  }
}

export interface JWTSubject {
  /**
   * Returns the unique identifier for the JWT subject.
   */
  getJWTIdentifier(): string | number;

  /**
   * Returns a key-value pair of custom claims to be added to the JWT.
   */
  getJWTCustomClaims(): Record<string, unknown>;
}

export abstract class BaseGuard {
  protected model: typeof Authenticatable;
  constructor(protected c: MyContext, protected guardName: string) {
    BaseGuard.init();
    this.model = BaseGuard.getModelFromGuard(guardName);
  }
  protected authUser: Authenticatable | null = null;

  protected rememberUser: boolean = false; // if "remember me" is checked

  protected static authConf: AuthConfig;
  public static init(): void {
    if (this.authConf) return; // Already initialized
    this.authConf = config("auth");
  }

  abstract attempt(
    credentials: Record<string, any>,
    remember?: boolean
  ): Promise<boolean | string>;

  private static getModelFromGuard(guardName: string): typeof Authenticatable {
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
    // @ts-ignore - We assume the model is compatible with the Authenticatable //
    return model as typeof Authenticatable;
  }

  abstract login(
    user: Authenticatable | JWTSubject,
    remember?: boolean
  ): Promise<unknown>;

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
}

export class JwtGuard extends BaseGuard {
  async check(): Promise<boolean> {
    // Implement JWT check logic
    if (this.authUser) {
      // If user is already set in context, return true
      return true;
    }
    const { request } = this.c.get("myHono");
    if (request.user()) {
      this.authUser = request.user();
      return true;
    }
    const key = `auth_user`;

    // Check if JWT token exists in headers
    const token = request.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return false; // No token provided
    }
    // Verify the JWT token
    const user = JWTAuth.verify(token) as Record<string, unknown> | null;
    if (!user) {
      return false; // Invalid token
    }
    // Check if the user exists in the database
    const id = user.sub as string | number;
    const instanceUser = (await this.model.find(id)) as Authenticatable | null;
    if (!instanceUser) {
      return false; // User not found
    }
    if (user.remember) {
      // If the user has a "remember me" token, set it
      this.rememberUser = user.remember as boolean;
    }
    // Set the authenticated user
    this.authUser = instanceUser;

    // Store the user in the context for later use
    this.c.set(key, instanceUser);

    return true; // Placeholder
  }

  async attempt(
    credentials: Record<string, any>,
    remember: boolean = false
  ): Promise<string | false> {
    const provider = JwtGuard.authConf?.guards?.[this.guardName]?.provider;
    const selectedProvider = JwtGuard.authConf?.providers?.[provider];
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
      .where(credentialKey, credentials[credentialKey])
      .first()) as Authenticatable | null;
    if (!user) {
      return false;
    }
    if (!Hash.check(credentials[passwordKey], user.getAuthPassword())) {
      return false;
    }

    return await this.login(user, remember);
  }

  async login(
    user: Authenticatable | JWTSubject,
    remember: boolean = false
  ): Promise<string | false> {
    // check if it has a method of JWTSubject
    if (
      !methodExist(user, "getJWTIdentifier") ||
      !methodExist(user, "getJWTCustomClaims")
    ) {
      abort(400, "User model is not JWTSubject");
    }

    const token = JWTAuth.fromUser(user as unknown as JWTSubject, remember);

    this.rememberUser = remember;
    this.authUser = user as Authenticatable;
    const key = `auth_user`;
    this.c.set(key, this.authUser);
    return token; // Return the generated JWT token
  }

  user(): Authenticatable | null {
    // Implement JWT user retrieval logic
    return this.authUser;
  }

  logout(): void {
    // No logout logic for JWT, but you can clear the user from context
    const key = `auth_${this.guardName}_user`;
    // @ts-ignore //
    this.c.set(key, null);
    this.authUser = null;
  }

  viaRemember(): boolean {
    // JWT does not have a "remember me" concept, but you can implement custom logic if needed
    return this.rememberUser;
  }
}

export class SessionGuard extends BaseGuard {
  async check(): Promise<boolean> {
    // Implement session check logic

    const key = "auth_user";
    if (this.authUser) {
      // If user is already set in context, return true
      this.c.set(key, this.authUser);
      return true;
    }
    const { request } = this.c.get("myHono");
    if (request.user()) {
      this.authUser = request.user() as Authenticatable;
      this.c.set(key, this.authUser);
    }
    const sessguardKey = `auth_${this.guardName}_user`;

    // @ts-ignore //
    const checkUser = request.session.get(sessguardKey) as Record<
      string,
      any
    > | null;
    if (checkUser) {
      // If user is already set in context, return true
      // @ts-ignore //
      this.authUser = new this.model(
        checkUser as AuthenticatableAttrSession
      ) as Authenticatable;
      this.c.set(key, this.authUser);
      return true;
    }

    // Check if remember token exists in cookies
    const rememberToken = request.cookie(sessguardKey);
    if (rememberToken) {
      const user = (await this.model
        .where("remember_token", rememberToken)
        .first()) as Authenticatable | null;
      if (user) {
        this.rememberUser = true;
        this.authUser = user;
        this.c.set(key, this.authUser);
        return true;
      }
    }
    return false; // Placeholder
  }

  async attempt(
    credentials: Record<string, any>,
    remember: boolean = false
  ): Promise<boolean> {
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
      .where(credentialKey, credentials[credentialKey])
      .first()) as Authenticatable | null;
    if (!user) {
      return false;
    }
    if (!Hash.check(credentials[passwordKey], user.getAuthPassword())) {
      return false;
    }
    return await this.login(user, remember);
  }

  user(): Authenticatable | null {
    const { request } = this.c.get("myHono");
    const sessguardKey = `auth_${this.guardName}_user`;
    // @ts-ignore //
    return request.session.get(sessguardKey) as Authenticatable | null;
  }

  async login(
    user: Authenticatable,
    remember: boolean = false
  ): Promise<boolean> {
    this.authUser = user;
    const rawAttributes = user.getRawAttributes();
    const { request } = this.c.get("myHono");
    const key = "auth_user";
    const sessguardKey = `auth_${this.guardName}_user`;
    request.session.put(
      // @ts-ignore //
      sessguardKey,
      rawAttributes as AuthenticatableAttrSession
    );
    this.c.set(key, user);
    const Cookie = this.c.get("myHono").Cookie;
    if (remember) {
      // If "remember me" is checked, set the remember token
      const generatedToken = `${
        this.guardName
      }_${user.getAuthIdentifier()}_${strToTime(Carbon.now().addDays(30))}`;
      const rememberToken = Hash.make(generatedToken);
      await user.setRememberToken(rememberToken);
      await user.save();

      Cookie.queue(sessguardKey, rememberToken, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      this.rememberUser = true;
    }
    return true; // Login successful
  }

  logout(): void {
    const { request } = this.c.get("myHono");
    const sessguardKey = `auth_${this.guardName}_user`;
    const Cookie = this.c.get("myHono").Cookie;
    // @ts-ignore //
    request.session.forget(sessguardKey);
    Cookie.queue(sessguardKey, "", {
      maxAge: -1, // Delete the cookie
    });
    // @ts-ignore //
    this.c.set("auth_user", null);
  }

  viaRemember(): boolean {
    const { request } = this.c.get("myHono");
    const sessguardKey = `auth_${this.guardName}_user`;
    // @ts-ignore //
    const user = request.session.get(sessguardKey) as Authenticatable | null;
    return user ? !!user.remember_token : false;
  }
}

export class TokenGuard extends BaseGuard {
  async check(): Promise<boolean> {
    const key = `auth_user`;
    if (this.authUser) {
      this.c.set(key, this.authUser);
      return true;
    }
    const checkUser = this.c.get(key);
    if (checkUser) {
      this.c.set(key, checkUser);
      return true;
    }
    // Implement token check logic
    const { request } = this.c.get("myHono");

    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!isset(token) || empty(token)) {
      return false;
    }

    const user = (await this.model
      .where("api_token", token)
      .first()) as Authenticatable;
    if (!user) {
      return false;
    }
    this.c.set(key, user);
    return true; // Placeholder
  }

  async attempt(credentials: Record<string, any>): Promise<string | false> {
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
      .where(credentialKey, credentials[credentialKey])
      .first()) as Authenticatable | null;
    if (!user) {
      return false;
    }
    if (!Hash.check(credentials[passwordKey], user.getAuthPassword())) {
      return false;
    }
    return await this.login(user);
  }

  async login(user: Authenticatable): Promise<string | false> {
    this.authUser = user;
    const rawAttributes = user.getRawAttributes();

    const key = `auth_user`;
    if (!keyExist(rawAttributes, "api_token")) {
      throw new Error(
        // @ts-ignore //
        `Table ${new this.model().getTableName()} have no api_token column.`
      );
    }
    this.c.set(key, user);
    // @ts-ignore //
    return rawAttributes.api_token as string;
  }

  user() {
    const key = `auth_${this.guardName}_user`;
    // @ts-ignore //
    return this.c.get(key) as Authenticatable | null;
  }

  logout() {
    const key = "auth_user";
    this.c.set(key, null);
    // Optionally, you can also delete the token from the database
  }

  viaRemember(): boolean {
    return this.rememberUser;
  }
}
