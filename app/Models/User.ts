import { ModelWithAttributes } from "Illuminate/Database/Eloquent/index.ts";
import { Authenticatable } from "Illuminate/Contracts/Auth/index.ts";

export type UserSchema = {
  id?: number;
  email: string;
  password: string;
  name: string;
};

class User extends Authenticatable<{ _attributes: UserSchema }> {
  // Laravel-like implementation here
  protected override _fillable = [];

  protected override _hidden = [];
}

export default User;
