class VerifyCsrf {
  public handle: HttpMiddleware = async ({ request }, next) => {
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) &&
      !request.ajax()
    ) {
      const tokenFromInput = request.input("_token");
      const tokenFromCookie = request.cookie("XSRF-TOKEN");

    }
    return next();
  };

  private async decryptCsrfToken(token: string): Promise<boolean> {
    return true;
  }
}

export default VerifyCsrf;
