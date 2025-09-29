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
  api_token?: string;
};

class User extends Authenticatable<UserSchema> implements JWTSubject {
  // Laravel-like implementation here
  protected static override _fillable = [
    "email",
    "password",
    "name",
    "api_token",
  ];
  protected static override _guarded: string[] = [];

  protected static override use = {
    HasFactory,
  };

  protected static override _hidden = ["password"];

  public getJWTCustomClaims(): Record<string, unknown> {
    return {
      email: this.getRawAttribute("email"),
      name: this.getRawAttribute("name"),
    };
  }

  public getJWTIdentifier(): string | number {
    return this.getAuthIdentifier() || "";
  }
}

export default User;
