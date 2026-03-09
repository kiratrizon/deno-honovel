import { CookieOptions } from "hono/utils/cookie";
import { getCookie, setCookie } from "hono/cookie";
import CookieKeysCache from "./CookieKeysCache.ts";
import { setMyCookie, getMyCookie, getAllCookies } from "./cookieHelpers.ts";

export default class Cookie {
  #exceptions: string[] = [];

  #addedToQueue: Record<
    string,
    [Exclude<unknown, undefined>, CookieOptions, boolean]
  > = {};
  constructor(private c: MyContext) {}

  public queue(
    key: string,
    value: Exclude<unknown, undefined>,
    options: CookieOptions = {},
  ): unknown {
    if (isset(key) && isset(value)) {
      if (this.#exceptions.includes(key)) {
        setCookie(this.c, key, value as string, options);
      } else {
        setMyCookie(this.c, key, value, options);
      }

      this.#addedToQueue[key] = [
        value,
        options,
        this.#exceptions.includes(key),
      ];
      return;
    }
  }

  public make<T extends Exclude<unknown, undefined>>(
    key: string,
    value: T,
    options: CookieOptions = {},
  ): { key: string; value: T; options: CookieOptions } {
    return { key, value, options };
  }

  public get<T extends any | null>(key: string): T {
    if (isset(key)) {
      const cookieValue = getCookie(this.c, key);
      return getMyCookie(cookieValue, this.#exceptions.includes(key)) as T;
    }
    return null as T;
  }

  public all(): Record<string, string> {
    return getAllCookies(this.c, this.#exceptions);
  }

  public forget(key: string): {
    key: string;
    value: Exclude<unknown, undefined>;
    options: CookieOptions;
  } {
    return this.make(key, "", {
      maxAge: 0,
      expires: new Date(0),
    });
  }

  public setExceptions(keys: string[]): void {
    if (!isArray(keys)) {
      throw new Error("Keys must be an array of strings.");
    }
    this.#exceptions = keys;
  }

  public getQueued(): Record<
    string,
    [Exclude<unknown, undefined>, CookieOptions, boolean]
  > {
    return this.#addedToQueue;
  }
}
