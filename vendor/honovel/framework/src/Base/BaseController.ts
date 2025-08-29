import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { IBaseModelProperties } from "../../../@types/declaration/Base/IBaseModel.d.ts";

class BaseController {
  static bindedModel?: typeof Model<IBaseModelProperties>;
}

export default BaseController;
