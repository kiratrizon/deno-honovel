export default class EncryptCookies {
  // List of cookie names that should not be encrypted
  private readonly except: string[] = [];

  public handle: HttpMiddleware = async ({ Cookie }, next) => {
    // Implement logic here
    Cookie.setExceptions(this.except);
    return next();
  };
}
