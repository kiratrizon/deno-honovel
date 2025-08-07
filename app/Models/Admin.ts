import {
  Model,
  schemaKeys,
  ModelWithAttributes,
} from "Illuminate/Database/Eloquent/index.ts";

export type AdminSchema = {
  id?: number;
  email: string;
  password: string;
  name: string;
};

class BaseAdmin extends Model<{ _attributes: AdminSchema }> {
  // Laravel-like implementation here
  protected override _fillable = schemaKeys<AdminSchema>([
    "email",
    "password",
    "name",
  ]);

  protected override _hidden = schemaKeys<AdminSchema>(["password"]);
}

const Admin = BaseAdmin as ModelWithAttributes<AdminSchema, typeof BaseAdmin>;

export default Admin;
