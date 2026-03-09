function resolveAppKey(rawKey: string, keyBytes: number): Uint8Array {
  if (rawKey.startsWith("base64:")) {
    const decoded = Uint8Array.from(atob(rawKey.slice(7)), (c) =>
      c.charCodeAt(0),
    );
    return decoded.slice(0, keyBytes);
  }

  const encoder = new TextEncoder();
  return encoder.encode(rawKey).slice(0, keyBytes);
}

export default class SessionInitializer {
  public static appKeys: Uint8Array[] = [];

  public static async init() {
    // Initialize app keys for encryption
    const appConfig = config("app");
    const cipher = appConfig.cipher || "AES-256-CBC";
    const keySize = parseInt(cipher.match(/AES-(\d+)-/)?.[1] || "256", 10);
    const keyBytes = keySize / 8;
    const keys = [appConfig.key, ...(appConfig.previous_keys || [])]
      .filter((k) => isset(k) && !empty(k) && isString(k))
      .map((k) => resolveAppKey(k, keyBytes));
    if (keys.length === 0) {
      throw new Error(
        'APP_KEY is not set. Please run "deno task smelt key:generate" to generate a key.',
      );
    }
    this.appKeys = keys;
  }
}
