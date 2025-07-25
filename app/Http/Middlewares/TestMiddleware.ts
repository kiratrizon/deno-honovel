export default class TestMiddleware {
  public handle: HttpMiddleware = async ({ request }, next, hello) => {
    // Implement logic here
    return next();
  };
}
