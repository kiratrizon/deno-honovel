import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { ModelAttributes } from "../../../@types/declaration/Base/IBaseModel.d.ts";

class BaseController {
  static bindedModel?: typeof Model<ModelAttributes>;
}

export default BaseController;
