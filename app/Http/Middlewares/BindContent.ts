import Content from "../../Models/Content.ts";

export default class BindContent {
  public handle: HttpMiddleware = async ({ request }, next) => {
    // Implement logic here

    request.bindRoute({ content: Content });
    return next();
  };
}
