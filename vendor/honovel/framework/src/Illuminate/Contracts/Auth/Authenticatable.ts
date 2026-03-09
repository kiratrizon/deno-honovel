import { Model } from "Illuminate/Database/Eloquent/index.ts";
import {
  AccessorMap,
  ModelAttributes,
} from "../../../../../@types/declaration/Base/IBaseModel.d.ts";

type AuthenticatableAttr = {
  password: string;
  remember_token?: string;
};

// New attributes type that merges both
type WithAuthAttributes<T> = AuthenticatableAttr & T;

/**
 * Provides authentication-related logic for a model,
 * including identifier access and remember token management.
 */
export default abstract class Authenticatable<
  S extends ModelAttributes = ModelAttributes,
  T extends Record<string, unknown> = WithAuthAttributes<S>,
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
