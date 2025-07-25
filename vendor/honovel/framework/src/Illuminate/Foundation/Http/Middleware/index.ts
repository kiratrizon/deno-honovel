export class VerifyCsrfToken {
  public handle: HttpMiddleware = async ({ request }, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      const tokenFromInput = request.input("_token");
      const tokenFromCookie = request.cookie("XSRF-TOKEN");
      const tokenFromHeader = request.header("x-csrf-token");
    }
    return next();
  };

  private async decryptCsrfToken(token: string): Promise<boolean> {
    return true;
  }
}

export class ConvertEmptyStringsToNull {
  public handle: HttpMiddleware = async ({ request }, next) => {
    request.merge(request.clean(request.all()));
    return next();
  };
}