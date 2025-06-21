import { IBaseModelProperties } from "../../vendor/honovel/framework/src/@hono-types/declaration/Base/IBaseModel.d.ts";
import BaseModel from "../../vendor/honovel/framework/src/Base/BaseModel.ts";


class Model<T extends IBaseModelProperties> extends BaseModel<T> {

}




export default Model;