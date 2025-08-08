import {
  Authenticatable,
  JWTSubject,
} from "Illuminate/Contracts/Auth/index.ts";

export type UserSchema = {
  id?: number;
  email: string;
  password: string;
  name: string;
};

class User
  extends Authenticatable<{ _attributes: UserSchema }>
  implements JWTSubject
{
  // Laravel-like implementation here
  protected override _fillable = [];

  protected override _hidden = ["password"];

  public getJWTCustomClaims(): Record<string, unknown> {
    return {
      email: this._attributes.email,
      name: this._attributes.name,
    };
  }

  public getJWTIdentifier(): string | number {
    return this.id || "";
  }
}

export default User;
