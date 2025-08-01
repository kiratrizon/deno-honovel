import { CookieOptions } from "hono/utils/cookie";
import { getCookie, setCookie } from "hono/cookie";
import { Buffer } from "node:buffer";
import { hmac } from "jsr:@noble/hashes@1.8.0/hmac";
import { sha256 } from "jsr:@noble/hashes@1.8.0/sha2";

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

export function generateAppKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));

  // Convert Uint8Array to binary string
  const binary = String.fromCharCode(...key);

  // Then base64 encode it
  const base64Key = btoa(binary);

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
    throw new Error(
      "APP_KEY is not set. Please set it in your environment variables."
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
  public static keys: Buffer[] = [];
  public static mainKey: Buffer;
  public static init() {
    const appConfig = staticConfig("app");
    const allKeys = [appConfig.key, ...appConfig.previous_keys]
      .filter((k) => isset(k) && !empty(k) && isString(k))
      .map(resolveAppKey);
    if (empty(allKeys)) {
      throw new Error(
        "APP_KEY is not set. Please set it in your environment variables."
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

function resolveAppKey(rawKey: string): Buffer {
  if (rawKey.startsWith("base64:")) {
    return Buffer.from(rawKey.slice(7), "base64");
  }

  return Buffer.from(rawKey, "utf-8");
}
