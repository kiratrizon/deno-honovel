import { ModelWithAttributes } from "../../vendor/honovel/framework/src/@hono-types/declaration/Base/IBaseModel.d.ts";
import Model from "./Model.ts";


interface UserAttributes {
    id?: number;
}

class User extends Model<{ _attributes: UserAttributes }> {
    declare id?: number;

}

export default User;
