import { CookieOptions } from "hono/utils/cookie";
import { getCookie, setCookie } from "hono/cookie";
import { hmac } from "hmac";
import { sha256 } from "sha2";

// Utility to convert a Uint8Array to a base64url string
function toBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Create HMAC SHA256 signature, using a key as Buffer or Uint8Array
function createExpectedSignature(base64Value: string, key: Uint8Array): string {
  const sig = hmac(sha256, key, new TextEncoder().encode(base64Value));
  return toBase64Url(sig);
}

export const setMyCookie = (
  c: MyContext,
  key: string,
  value: Exclude<any, undefined>,
  options: CookieOptions = {}
) => {
  const appConfig = config("app");
  if (empty(appConfig.key) || !isString(appConfig.key)) {
    throw new Error(
      'APP_KEY is not set. Please run "deno task smelt key:generate" to generate a key.'
    );
  }
  if (value === undefined || !isString(key)) {
    throw new Error("Invalid arguments for setting cookie.");
  }
  const newValue = `${base64encode(jsonEncode(value))}`;
  if (
    isUndefined(newValue) ||
    !isString(key) ||
    !isset(CookieKeysCache.mainKey)
  ) {
    throw new Error("Invalid arguments for setting cookie.");
  }
  const signedValue = `${newValue}.${createExpectedSignature(
    newValue,
    CookieKeysCache.mainKey
  )}`;
  setCookie(c, key, signedValue, options);
};

export class CookieKeysCache {
  public static keys: Uint8Array[] = [];
  public static mainKey: Uint8Array;
  public static init() {
    const appConfig = config("app");
    const allKeys = [appConfig.key, ...appConfig.previous_keys]
      .filter((k) => isset(k) && !empty(k) && isString(k))
      .map(resolveAppKey);
    if (empty(allKeys)) {
      throw new Error(
        'APP_KEY is not set. Please run "deno task smelt key:generate" to generate a key.'
      );
    }
    this.keys = allKeys;
    this.mainKey = this.keys[0];
  }
}

// Overloads
export function getMyCookie(c: MyContext): Record<string, string>;
export function getMyCookie(
  c: MyContext,
  key: string
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
        if (parts.length !== 2) return; // invalid format → skip

        const [base64Value, signature] = parts;

        const expectedSignature = createExpectedSignature(base64Value, myKey);

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
      });
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
      if (parts.length !== 2) continue; // invalid format → skip

      const [base64Value, signature] = parts;

      const expectedSignature = createExpectedSignature(base64Value, myKey);

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

function resolveAppKey(rawKey: string): Uint8Array {
  if (rawKey.startsWith("base64:")) {
    const base64Str = rawKey.slice(7);
    // Decode base64 to bytes
    return Uint8Array.from(atob(base64Str), (c) => c.charCodeAt(0));
  }

  // Encode UTF-8 string to bytes
  return new TextEncoder().encode(rawKey);
}

export class Cookie {
  constructor(private c: MyContext) {}

  public queue(
    key: string,
    value: Exclude<unknown, undefined>,
    options: CookieOptions = {}
  ): unknown {
    if (isset(key) && isset(value)) {
      setMyCookie(this.c, key, value, options);
      return;
    }
  }

  public make(
    key: string,
    value: Exclude<unknown, undefined>,
    options: CookieOptions = {}
  ): { key: string; value: string; options: CookieOptions } {
    return { key, value: String(value), options };
  }

  public get<T extends unknown>(key: string): T | null {
    if (isset(key)) {
      return getMyCookie(this.c, key) as T;
    }
    return null;
  }

  public all(): Record<string, string> {
    return getMyCookie(this.c) as Record<string, string>;
  }
}
