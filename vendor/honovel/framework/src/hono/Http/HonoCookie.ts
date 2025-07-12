import { CookieOptions } from "hono/utils/cookie";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Hash } from "Illuminate/Support/Facades";
import { Str } from "Illuminate/Support";
import { Buffer } from "node:buffer";
import { createHmac } from "node:crypto";
import { init } from "https://deno.land/x/base64@v0.2.1/base.ts";


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
  const appConfig = staticConfig("app");
  if (empty(appConfig.key) || !isString(appConfig.key)) {
    throw new Error("APP_KEY is not set. Please set it in your environment variables.");
  }
  const myKey = resolveAppKey(appConfig.key);
  if (value === undefined || !isString(key)) {
    throw new Error("Invalid arguments for setting cookie.");
  }
  const newValue = `${base64encode(jsonEncode(value))}`;
  if (isUndefined(newValue) || !isString(key) || !isset(myKey)) {
    throw new Error("Invalid arguments for setting cookie.");
  }
  const signedValue = `${newValue}.${createHmac("sha256", myKey).update(newValue).digest("base64url")}`;

  setCookie(c, key, signedValue, options);
};

export class CookieKeysCache {
  public static keys: Buffer[] = [];

  public static init() {
    const appConfig = staticConfig("app");
    const allKeys = [appConfig.key, ...appConfig.previous_keys].filter((k) => isset(k) && !empty(k) && isString(k)).map(resolveAppKey);
    if (empty(allKeys)) {
      throw new Error("APP_KEY is not set. Please set it in your environment variables.");
    }
    this.keys = allKeys;
  }
}

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

  if (!isset(key)) {
    const cookies = getCookie(c);
    const allCookies: Record<string, string> = {};
    for (const [cookieKey, cookieValue] of Object.entries(cookies)) {
      CookieKeysCache.keys.forEach((myKey) => {
        const parts = cookieValue.split(".");
        if (parts.length !== 2) return;  // invalid format → skip

        const [base64Value, signature] = parts;

        const expectedSignature = createHmac("sha256", myKey).update(base64Value).digest("base64url");

        if (signature === expectedSignature) {
          const decodedValue = base64decode(base64Value);
          try {
            const json = jsonDecode(decodedValue);
            allCookies[cookieKey] = json;
            // Here: you can return immediately (if key is provided) or collect result (if not)
          } catch {
            // Invalid JSON → skip
          }
        }
      })
    }
    return allCookies;
  }
  if (!isString(key) || empty(key)) {
    throw new Error("Invalid key for getting cookie.");
  }

  const cookieValue = getCookie(c, key);
  if (isset(cookieValue) && !empty(cookieValue)) {
    for (const myKey of CookieKeysCache.keys) {
      const parts = cookieValue.split(".");
      if (parts.length !== 2) continue;  // invalid format → skip

      const [base64Value, signature] = parts;

      const expectedSignature = createHmac("sha256", myKey).update(base64Value).digest("base64url");

      if (signature === expectedSignature) {
        const decodedValue = base64decode(base64Value);
        try {
          return jsonDecode(decodedValue);
        } catch {
          // Invalid JSON → skip
        }
      }
    }
  }

  return null;
}

function resolveAppKey(rawKey: string): Buffer {
  if (rawKey.startsWith("base64:")) {
    rawKey = Buffer.from(rawKey.slice(7), "base64").toString("utf-8");
  }

  return Buffer.from(rawKey, "utf-8");
}