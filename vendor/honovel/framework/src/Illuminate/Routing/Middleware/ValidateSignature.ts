import { URL } from "../../Support/Facades/index.ts";

export default class ValidateSignature {
  public handle: HttpMiddleware = async ({ request }, next) => {
    if (URL.verify(request.url)) {
      return next();
    }
    abort(403, "Invalid or Expired Signature");
  };
}
