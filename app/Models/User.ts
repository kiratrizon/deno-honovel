import {
  Model,
  ModelWithAttributes,
} from "Illuminate/Database/Eloquent";

export type UserSchema = {
  id?: number;
  email: string;
  password: string;
  name: string;
};

class BaseUser extends Model<{ _attributes: UserSchema }> {
  // Laravel-like implementation here
  protected override _fillable = [];

  protected override _hidden = [];
}

const User = BaseUser as ModelWithAttributes<UserSchema, typeof BaseUser>;

export default User;
