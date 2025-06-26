import {
  Model,
  schemaKeys,
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
  protected override _fillable = schemaKeys<UserSchema>([
    "email",
    "password",
    "name",
  ]);

  protected override _hidden = schemaKeys<UserSchema>(["password"]);
}

const User = BaseUser as ModelWithAttributes<UserSchema, typeof BaseUser>;

export default User;
