import { Context } from "hono";
import { getSignedCookie } from "hono/cookie";

class HonoCookie {
  #c: Context;
  constructor(c: Context) {
    this.#c = c;
  }
  async getSigned(key: string) {
    const APP_KEY = env("APP_KEY");
    if (!isset(APP_KEY) || empty(APP_KEY)) {
      return null;
    }
    if (!APP_KEY.startsWith("base64:")) {
      return null;
    }
    const [, secretKey] = APP_KEY.split(":");
    const cookie = await getSignedCookie(this.#c, key, secretKey);
    if (!isset(cookie) || empty(cookie)) {
      return null;
    }
    return cookie;
  }

  async validateSigned() {}
}

export default HonoCookie;
