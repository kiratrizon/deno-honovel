import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { IBaseModelProperties } from "../../../../../@types/declaration/Base/IBaseModel.d.ts";
import { DB, Hash } from "Illuminate/Support/Facades/index.ts";
import { AuthConfig } from "configs/@types/index.d.ts";

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
    this.rememberToken = token;
  }

  /**
   * Returns the name of the "remember me" token field.
   */
  getRememberTokenName(): string {
    return "remember_token";
  }
}

abstract class BaseGuard {
  protected model: typeof Authenticatable;
  constructor(protected c: MyContext, protected guardName: string) {
    BaseGuard.init();
    this.model = BaseGuard.getModelFromGuard(guardName);
  }

  protected static authConf: AuthConfig;
  public static init(): void {
    if (this.authConf) return; // Already initialized
    this.authConf = staticConfig("auth");
  }
  abstract check(): Promise<boolean>;
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
    return model as typeof Authenticatable;
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
}

export class SessionGuard extends BaseGuard {
  async check(): Promise<boolean> {
    // Implement session check logic
    return true; // Placeholder
  }

  async attempt(
    credentials: Record<string, any>,
    remember?: boolean
  ): Promise<boolean> {
    // Implement session authentication logic
    return true; // Placeholder
  }
}

export class TokenGuard extends BaseGuard {
  async check(): Promise<boolean> {
    // Implement token check logic
    const { request } = this.c.get("myHono");

    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!isset(token)) {
      return false;
    }

    return true; // Placeholder
  }

  async attempt(
    credentials: Record<string, any>,
    remember?: boolean
  ): Promise<string | false> {
    const provider = TokenGuard.authConf?.guards?.[this.guardName]?.provider;
    const selectedProvider = TokenGuard.authConf?.providers?.[provider];
    if (!selectedProvider) {
      throw new Error(
        `Provider ${provider} not found for guard ${this.guardName}`
      );
    }
    const model = selectedProvider.model;
    const credentialKey = selectedProvider.credentialKey || "email";
    const passwordKey = selectedProvider.passwordKey || "password";
    if (
      !keyExist(credentials, credentialKey) ||
      !keyExist(credentials, passwordKey)
    ) {
      return false;
    }
    const instanced = new model();
    const table = instanced.getTableName();
    // @ts-ignore //
    if (instanced._softDelete) {
      // Handle soft delete case
    }
    const user = (await DB.select(
      `SELECT * FROM ${table} WHERE ${credentialKey} = ?`,
      [credentials[credentialKey]]
    )) as AuthenticatableAttrToken[];
    if (user.length === 0) {
      return false;
    }
    const data = user[0];
    // @ts-ignore //
    if (Hash.check(credentials[passwordKey], data[passwordKey])) {
      return data.api_token || false;
    }
    return false;
  }
}
