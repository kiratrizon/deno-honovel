export default class CookieKeysCache {
  public static keys: Uint8Array[] = [];
  public static mainKey: Uint8Array;
  public static init() {
    const appConfig = config("app");
    const allKeys = [appConfig.key, ...appConfig.previous_keys]
      .filter((k) => isset(k) && !empty(k) && isString(k))
      .map(resolveAppKey);
    if (empty(allKeys)) {
      throw new Error(
        'APP_KEY is not set. Please run "deno task smelt key:generate" to generate a key.',
      );
    }
    this.keys = allKeys;
    this.mainKey = this.keys[0];
  }
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
