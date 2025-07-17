import { ModelWithAttributes } from "Illuminate/Database/Eloquent/index.ts";
import { Authenticatable } from "Illuminate/Contracts/Auth/index.ts";

export type UserSchema = {
  id?: number;
  email: string;
  password: string;
  name: string;
};

class BaseUser extends Authenticatable<{ _attributes: UserSchema }> {
  // Laravel-like implementation here
  protected override _fillable = [];

  protected override _hidden = [];
}

const User = BaseUser as ModelWithAttributes<UserSchema, typeof BaseUser>;

export default User;
