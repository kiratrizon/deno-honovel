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

// Implementation
export function getMyCookie(
  cookieValue: any,
  fromException: boolean = false
): string | null {
  if (fromException) {
    return cookieValue;
  }
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

export function getAllCookies(
  c: MyContext,
  exceptions: string[]
): Record<string, string> {
  const cookies = getCookie(c);
  const cookieDoneConverted: Record<string, string> = {};
  for (const [cookieKey, cookieValue] of Object.entries(cookies)) {
    if (exceptions.includes(cookieKey)) {
      cookieDoneConverted[cookieKey] = cookieValue;
      continue;
    }
    CookieKeysCache.keys.forEach((myKey) => {
      const parts = cookieValue.split(".");
      if (parts.length !== 2) return; // invalid format → skip

      const [base64Value, signature] = parts;

      const expectedSignature = createExpectedSignature(base64Value, myKey);

      if (signature === expectedSignature) {
        const decodedValue = base64decode(base64Value);
        try {
          const json = jsonDecode(decodedValue);
          cookieDoneConverted[cookieKey] = json;
          // Here: you can return immediately (if key is provided) or collect result (if not)
        } catch {
          // Invalid JSON → skip
        }
      }
    });
  }
  return cookieDoneConverted;
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
  #exceptions: string[] = [];

  #addedToQueue: Record<
    string,
    [Exclude<unknown, undefined>, CookieOptions, boolean]
  > = {};
  constructor(private c: MyContext) {}

  public queue(
    key: string,
    value: Exclude<unknown, undefined>,
    options: CookieOptions = {}
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
    options: CookieOptions = {}
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
