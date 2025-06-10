class VerifyCsrf {
  public handle: HttpMiddleware = async ({ request, cookie }, next) => {
    return next();
  };

  private async decryptCsrfToken(token: string): Promise<boolean> {
    return true;
  }
}

export default VerifyCsrf;
