import { CookieOptions } from "hono/utils/cookie";

class HonoCookie {
  private myCookie: Record<string, [string, CookieOptions]> = {};

  set(
    key: string,
    value: Exclude<unknown, undefined>,
    options: CookieOptions = {}
  ) {
    if (typeof value === "undefined") {
      throw new Error("Cookie value cannot be undefined");
    }
    this.myCookie[key] = [jsonEncode(value), options];
  }
}

export default HonoCookie;
