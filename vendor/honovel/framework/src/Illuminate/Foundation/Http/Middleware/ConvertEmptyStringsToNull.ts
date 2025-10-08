export default class ConvertEmptyStringsToNull {
  public handle: HttpMiddleware = async ({ request }, next) => {
    request.merge(request.clean(request.all()));
    return next();
  };
}
