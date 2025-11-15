import { ModelAttributes } from "../../../../../@types/declaration/Base/IBaseModel.d.ts";
import { Model } from "../../Database/Eloquent/index.ts";

export default class SubstituteBindings {
  /**
   * This is to mimic Laravel's route model binding feature.
   * It binds route parameters to model instances based on the parameter name.
   * For example, if a route has a parameter {user}, it will bind it to a User model instance.
   * If the model instance is not found, it will abort with a 404 error.
   */
  private readonly routerBindings: Record<
    string,
    typeof Model<ModelAttributes>
  > = {
    // route parameter name => Model class
  };

  public handle: HttpMiddleware = async ({ request }, next) => {
    request.bindRoute(this.routerBindings);

    return next();
  };
}
