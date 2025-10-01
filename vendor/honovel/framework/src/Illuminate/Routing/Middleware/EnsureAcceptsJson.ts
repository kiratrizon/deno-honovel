export default class EnsureAcceptsJson {
  public handle: HttpMiddleware = async ({ request }, next) => {
    if (!request.expectsJson()) {
      abort(406, "Not Acceptable");
    }
    return next();
  };
}
