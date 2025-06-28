import { Context } from "hono";
import { CookieOptions } from "hono/utils/cookie";
import { setSignedCookie, getSignedCookie, deleteCookie, getCookie, setCookie } from "hono/cookie";
import { getAppKey } from "./HonoSession.ts";

class HonoCookie {
  #c: Context;

  constructor(c: Context) {
    this.#c = c;
  }
  public set(
    key: string,
    value: Exclude<unknown, undefined>,
    options: CookieOptions = {}
  ) {
    if (isUndefined(value) || !isString(key)) {
      throw new Error("Invalid arguments for setting cookie.");
    }
    setCookie(this.#c, key, value, options);
  }

  public async setSigned(
    key: string,
    value: Exclude<unknown, undefined>,
    options: CookieOptions = {}
  ) {
    if (isUndefined(value) || !isString(key)) {
      throw new Error("Invalid arguments for setting signed cookie.");
    }
    await setSignedCookie(this.#c, key, value, getAppKey(), options);

  }
}

export default HonoCookie;
