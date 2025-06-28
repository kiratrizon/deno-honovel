class VerifyCsrf {
  public handle: HttpMiddleware = async ({ request }, next) => {
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method())
    ) {
      const tokenFromInput = request.input("_token");
      const tokenFromCookie = request.cookie("XSRF-TOKEN");
      const tokenFromHeader = request.header("x-csrf-token");
    }
    console.log(request)
    return next();
  };

  private async decryptCsrfToken(token: string): Promise<boolean> {
    return true;
  }
}

export default VerifyCsrf;
