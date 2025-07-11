import { CookieOptions } from "hono/utils/cookie";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Hash } from "Illuminate/Support/Facades";
import { Str } from "Illuminate/Support";

export class MyCachedHashedApp {
  static #cachedAppKey: string | null = null;
  static init() {
    if (!this.#cachedAppKey) {
      this.#cachedAppKey = getAppKey();
    }
  }

  static getCachedAppKey(): string {
    if (!this.#cachedAppKey) {
      throw new Error("App key is not initialized. Call init() first.");
    }
    return this.#cachedAppKey;
  }
}

export function getAppKey(): string {
  const appKey = env("APP_KEY", "");
  if (!appKey) {
    throw new Error("APP_KEY is not set in the environment variables.");
  }
  if (!appKey.startsWith("base64:")) {
    throw new Error("APP_KEY must be a base64 encoded string.");
  }
  return base64decode(appKey.slice(7)); // Remove 'base64:' prefix
}

export function generateAppKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  // convert to string first
  const keyString = Array.from(key, (byte) => String.fromCharCode(byte)).join(
    ""
  );
  // then encode to base64
  const base64Key = base64encode(keyString);

  return `base64:${base64Key}`;
}

export const setMyCookie = (
  c: MyContext,
  key: string,
  // deno-lint-ignore no-explicit-any
  value: Exclude<any, undefined>,
  options: CookieOptions = {}
) => {
  const myKey = MyCachedHashedApp.getCachedAppKey();
  if (value === undefined || !isString(key)) {
    throw new Error("Invalid arguments for setting cookie.");
  }
  const newValue = `${base64encode(jsonEncode(value))}`;
  if (isUndefined(newValue) || !isString(key) || myKey === "") {
    throw new Error("Invalid arguments for setting cookie.");
  }

  const signedValue = `${newValue}.${myKey}`;
  setCookie(c, key, signedValue, options);
};

// Overloads
export function getMyCookie(c: MyContext): Record<string, string>;
export function getMyCookie(
  c: MyContext,
  key: string
  // deno-lint-ignore no-explicit-any
): Exclude<any, undefined> | null;

// Implementation
export function getMyCookie(
  c: MyContext,
  key?: string
): string | null | Record<string, string> {
  const appKeyHash = MyCachedHashedApp.getCachedAppKey();

  if (isUndefined(key)) {
    const cookies = getCookie(c) || {};
    const newCookies: Record<string, string> = {};

    for (const [cookieKey, cookieValue] of Object.entries(cookies)) {
      const [value, signatureKey] = cookieValue.split(".");
      if (signatureKey === appKeyHash && value) {
        try {
          newCookies[cookieKey] = jsonDecode(base64decode(value));
        } catch {
          // skip invalid
        }
      }
    }
    return newCookies;
  }

  if (!isString(key)) throw new Error("Invalid key for getting cookie.");

  const cookieValue = getCookie(c, key);
  if (!cookieValue) return null;

  const [value, signatureKey] = cookieValue.split(".");
  if (signatureKey !== appKeyHash || !value) return null;

  try {
    return jsonDecode(base64decode(value));
  } catch {
    return null;
  }
}
