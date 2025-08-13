import {
  Authenticatable,
  JWTSubject,
} from "Illuminate/Contracts/Auth/index.ts";
import { HasFactory } from "Illuminate/Database/Eloquent/Factories/index.ts";

export type UserSchema = {
  id?: number;
  email: string;
  password: string;
  name: string;
};

class User extends Authenticatable<UserSchema> implements JWTSubject {
  // Laravel-like implementation here
  protected _fillable = ["email", "password", "name", "api_token"];
  protected _guarded: string[] = [];

  static override use: Record<string, unknown> = {
    HasFactories: HasFactory,
  };

  protected override _hidden = ["password"];

  public getJWTCustomClaims(): Record<string, unknown> {
    return {
      email: this._attributes.email,
      name: this._attributes.name,
    };
  }

  public getJWTIdentifier(): string | number {
    return this.getAuthIdentifier() || "";
  }
}

export default User;
