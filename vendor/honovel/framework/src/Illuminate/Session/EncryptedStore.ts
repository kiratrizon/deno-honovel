import { SessionDataTypes } from "../../../../@types/declaration/imain.d.ts";
import Store from "./Store.ts";

/**
 * A Store whose payload is encrypted at rest.
 *
 * Only the two serialization hooks are overridden, so the handler still moves
 * an opaque string and neither it nor SessionManager knows encryption is in
 * play. Selected by SessionManager when config("session").encrypt is true.
 *
 * The wire format is base64(iv || ciphertext). Decryption walks every
 * configured app key, so rotating APP_KEY (with the old one kept in
 * previous_keys) does not log everybody out.
 */
export default class EncryptedStore<
  D extends SessionDataTypes = SessionDataTypes,
> extends Store<D> {
  protected override async prepareForStorage(data: string): Promise<string> {
    return await EncryptedStore.encrypt(data);
  }

  protected override async prepareForUnserialize(
    data: string,
  ): Promise<string> {
    // An empty string reads back as an empty session rather than an error:
    // a payload we cannot decrypt is indistinguishable from no payload.
    return (await EncryptedStore.decrypt(data)) ?? "";
  }

  /**
   * AES-GCM when the configured cipher names GCM, AES-CBC otherwise.
   */
  private static mode(): { name: string; ivLength: number } {
    const cipher = config("app").cipher || "AES-256-CBC";
    const name = cipher.toUpperCase().includes("GCM") ? "AES-GCM" : "AES-CBC";
    return { name, ivLength: name === "AES-GCM" ? 12 : 16 };
  }

  private static cachedKeys: Uint8Array[] | null = null;

  /**
   * App keys sized to the configured cipher, newest first.
   */
  private static keys(): Uint8Array[] {
    if (this.cachedKeys) return this.cachedKeys;

    const appConfig = config("app");
    const cipher = appConfig.cipher || "AES-256-CBC";
    const keyBytes =
      parseInt(cipher.match(/AES-(\d+)-/)?.[1] || "256", 10) / 8;

    const keys = [appConfig.key, ...(appConfig.previous_keys || [])]
      .filter((k) => isset(k) && !empty(k) && isString(k))
      .map((k) => this.resolveKey(k as string, keyBytes));

    if (empty(keys)) {
      throw new Error(
        'config("session").encrypt is true but APP_KEY is not set. Run "deno task smelt key:generate".',
      );
    }

    this.cachedKeys = keys;
    return keys;
  }

  private static resolveKey(rawKey: string, keyBytes: number): Uint8Array {
    if (rawKey.startsWith("base64:")) {
      return Uint8Array.from(atob(rawKey.slice(7)), (c) =>
        c.charCodeAt(0),
      ).slice(0, keyBytes);
    }
    return new TextEncoder().encode(rawKey).slice(0, keyBytes);
  }

  private static async importKey(
    material: Uint8Array,
    usage: "encrypt" | "decrypt",
  ): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      "raw",
      material.buffer as ArrayBuffer,
      { name: this.mode().name },
      false,
      [usage],
    );
  }

  /**
   * Encrypt with the newest key. A fresh IV per write is prepended to the
   * ciphertext, so the same session never encrypts to the same bytes twice.
   */
  private static async encrypt(plaintext: string): Promise<string> {
    const { name, ivLength } = this.mode();
    const iv = crypto.getRandomValues(new Uint8Array(ivLength));
    const key = await this.importKey(this.keys()[0], "encrypt");

    const encrypted = await crypto.subtle.encrypt(
      { name, iv },
      key,
      new TextEncoder().encode(plaintext),
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return this.toBase64(combined);
  }

  /**
   * Try every configured key, so a session written before a key rotation is
   * still readable. Returns null when none of them work.
   */
  private static async decrypt(payload: string): Promise<string | null> {
    const { name, ivLength } = this.mode();

    let raw: Uint8Array;
    try {
      raw = this.fromBase64(payload);
    } catch {
      return null; // not our format at all
    }
    if (raw.length <= ivLength) return null;

    const iv = raw.slice(0, ivLength);
    const body = raw.slice(ivLength);

    for (const material of this.keys()) {
      try {
        const key = await this.importKey(material, "decrypt");
        const decrypted = await crypto.subtle.decrypt({ name, iv }, key, body);
        return new TextDecoder().decode(decrypted);
      } catch {
        continue; // wrong key, or tampered payload - try the next one
      }
    }

    return null;
  }

  private static toBase64(bytes: Uint8Array): string {
    let binary = "";
    // Chunked rather than String.fromCharCode(...bytes): a large session would
    // blow the argument limit with the spread form.
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  private static fromBase64(value: string): Uint8Array {
    return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  }
}
