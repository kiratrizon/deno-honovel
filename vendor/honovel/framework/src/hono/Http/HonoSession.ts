import { MiddlewareHandler } from "hono";
import * as path from "https://deno.land/std/path/mod.ts";

import { ISession } from "../../../../@types/declaration/ISession.d.ts";
import { Str } from "Illuminate/Support/index.ts";
import { getMyCookie, setMyCookie } from "./HonoCookie.ts";
import { deleteCookie } from "hono/cookie";
import RedisClient from "../../Maneuver/RedisClient.ts";
import { Migration } from "Illuminate/Database/Migrations/index.ts";
import { Schema, DB, Cache } from "Illuminate/Support/Facades/index.ts";
import { Carbon } from "honovel:helpers";
import {
  SessionConfig,
  SupportedDrivers,
} from "../../../../../../config/@types/index.d.ts";
import { RedisManager } from "Illuminate/Redis/index.ts";
import { Session } from "Illuminate/Session/index.ts";
import { CacheManager, AbstractStore } from "Illuminate/Cache/index.ts";

type SessionEncrypt = {
  encrypt: string; // encrypted session data
};

// Recursive type to exclude functions from any nested property
// deno-lint-ignore no-explicit-any
type NonFunction<T> = T extends (...args: any[]) => any
  ? never // exclude functions
  : T extends object
  ? { [K in keyof T]: NonFunction<T[K]> }
  : T;

export class HonoSession {
  public id: string;
  values: Record<string, NonFunction<unknown>>;
  constructor(id: string, values: Record<string, NonFunction<unknown>>) {
    this.id = id;
    this.values = values;
  }
  public async dispose() {
    await this.saveSession(this.id, this.values);
  }

  public update(values: Record<string, NonFunction<unknown>>) {
    this.values = { ...this.values, ...values };
  }

  private async saveSession(sid: string, data: Record<string, unknown>) {
    if (!isset(SessionModifier.sesConfig.lifetime))
      throw new Error("Session lifetime is not set in configuration");
    const type = SessionModifier.sesConfig.driver || "file";

    const isEncrypt = SessionModifier.sesConfig.encrypt || false;
    if (isEncrypt) {
      data = { encrypt: await encrypt(data) };
    }
    const dataToString = jsonEncode(data);
    switch (type) {
      case "database": {
        const tableSession = SessionModifier.sesConfig.table || "sessions";
        const expires = Carbon.now().addSeconds(
          SessionModifier.sesConfig.lifetime * 60
        );
        await DB.insertOrUpdate(
          tableSession,
          {
            sid,
            data: dataToString,
            expires,
          },
          ["sid"]
        );
        break;
      }
      case "file": {
        const pathDefault: string =
          SessionModifier.sesConfig.files || storagePath("framework/sessions");
        const filePath = path.join(
          pathDefault,
          `${sid.replace(SessionModifier.sesConfig.prefix || "sess:", "")}.json`
        );
        writeFile(filePath, dataToString);
        break;
      }
      case "redis": {
        await RedisClient.set(sid, dataToString, {
          ex: SessionModifier.sesConfig.lifetime, // convert minutes to seconds
        });
        break;
      }
      case "memory": {
        if (keyExist(HonoSessionMemory.sessions, sid)) {
          HonoSessionMemory.sessions[sid] = {
            ...HonoSessionMemory.sessions[sid],
            ...data,
          };
        } else {
          HonoSessionMemory.sessions[sid] = data;
        }
        break;
      }
      default: {
        throw new Error(`Unsupported session driver: ${type}`);
      }
    }
  }
}

class HonoSessionMemory {
  public static sessions: Record<string, Record<string, unknown>> = {};
}

export function honoSession(): MiddlewareHandler {
  return async (c: MyContext, next) => {
    // deno-lint-ignore no-explicit-any
    const value: Record<string, NonFunction<any>> = {};
    c.set("session", new Session(value));
    await next();
  };
}

export function sessionIdRecursive(): string {
  const prefix = SessionModifier.sesConfig.prefix || "sess:";

  const timestamp = date("YmdHis");

  const array = crypto.getRandomValues(new Uint8Array(16));
  const randomPart = Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${prefix}${timestamp}${randomPart}`;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export class SessionModifier {
  public static sesConfig: SessionConfig;
  public static store: AbstractStore;
  #c: MyContext;
  #canTouch = false;
  #started = false;
  #sessionId = "";
  // deno-lint-ignore no-explicit-any
  #value: Record<string, NonFunction<any>> = {};
  constructor(c: MyContext) {
    this.#c = c;
    this.#canTouch = !!this.#c.get("from_web");
  }

  public static init() {
    SessionModifier.sesConfig = staticConfig("session");
    if (!SessionModifier.sesConfig) {
      throw new Error("Session configuration is not set.");
    }
    const type = SessionModifier.sesConfig.driver || "file";
    const keyStore = `${type}_session`;
    const prefix = SessionModifier.sesConfig.prefix || "sess:";
    const configuration: {
      // For file driver
      path: string | null;
      // Uses connection depends on driver
      connection: string | null;
      // per-store override
      prefix: string | null;
      // for database driver
      table: string | null;
      // for memcached driver
      servers: { host: string; port: number; weight?: number }[];
    } = {
      path: null,
      connection: null,
      prefix: null,
      table: null,
      servers: [],
    };
    switch (type) {
      case "memory":
      case "object": {
        configuration.prefix = prefix;
        break;
      }
      case "file": {
        const pathDefault: string =
          SessionModifier.sesConfig.files || storagePath("framework/sessions");
        if (!pathExist(pathDefault)) {
          makeDir(pathDefault);
        }
        configuration.path = pathDefault;
        configuration.prefix = prefix;
        break;
      }
      case "redis": {
        configuration.connection = SessionModifier.sesConfig.connection;
        configuration.prefix = prefix;
        break;
      }
      case "database": {
        configuration.connection = SessionModifier.sesConfig.connection;
        configuration.table = SessionModifier.sesConfig.table || "sessions";
        configuration.prefix = prefix;
        break;
      }
    }
    // @ts-ignore //
    if (type !== "cache") {
      Cache.extend(keyStore, () => {
        // @ts-ignore //
        return new CacheManager(type, configuration).getStore();
      });
      this.store = Cache.store(keyStore);
    } else {
      const storeConfig =
        SessionModifier.sesConfig.store || staticConfig("cache").default;
      if (!isset(storeConfig)) {
        throw new Error("Session store configuration is not set.");
      }
      const stores = staticConfig("cache").stores || {};
      if (!keyExist(stores, storeConfig)) {
        throw new Error(`Session store "${storeConfig}" does not exist.`);
      }
      this.store = Cache.store(storeConfig);
    }
  }

  async start() {
    if (!this.#canTouch || this.#started) return;

    const key =
      SessionModifier.sesConfig.cookie ||
      Str.snake(env("APP_NAME", "honovel") + "_session");

    this.#sessionId = getMyCookie(this.#c, key);
    if (!isset(this.#sessionId)) {
      this.#sessionId = sessionIdRecursive();
    }
    setMyCookie(this.#c, key, this.#sessionId, {
      maxAge: SessionModifier.sesConfig.expireOnClose
        ? undefined
        : SessionModifier.sesConfig.lifetime * 60, // convert minutes to seconds
      sameSite: SessionModifier.sesConfig.sameSite || "lax",
      secure: SessionModifier.sesConfig.secure || false,
      httpOnly: SessionModifier.sesConfig.httpOnly || true,
      partitioned: SessionModifier.sesConfig.partitioned || false,
    });

    this.#value = await this.loadSession(this.#sessionId);
    // @ts-ignore //
    this.#c.get("session").updateValues(this.#value);
    // @ts-ignore //
    this.#c.get("session").updateId(this.#sessionId);
    this.#started = true;
  }

  async end() {
    if (!this.#canTouch || !this.#sessionId) return;

    deleteCookie(
      this.#c,
      SessionModifier.sesConfig.cookie ||
        Str.snake(env("APP_NAME", "honovel") + "_session")
    );
    await this.deleteSession(this.#sessionId);

    this.#c.set("logged_out", true);
    this.#started = false;
  }

  private updateValues(values: Record<string, unknown>) {
    this.#value = { ...this.#value, ...values };
  }

  public async dispose(values: Record<string, unknown> = {}) {
    if (!this.#canTouch || !this.#started) return;
    this.updateValues(values);
    await this.saveSession();
  }

  private async deleteSession(sid: string) {
    const type = SessionModifier.sesConfig.driver || "file";
    const key =
      type === "file"
        ? sid.replace(SessionModifier.sesConfig.prefix || "sess:", "")
        : sid;
    await SessionModifier.store.forget(key);
  }

  private async saveSession() {
    const sid = this.#sessionId;
    let data = this.#value;
    if (!isset(SessionModifier.sesConfig.lifetime)) {
      throw new Error("Session lifetime is not set in configuration");
    }
    const type = SessionModifier.sesConfig.driver || "file";
    const isEncrypt = SessionModifier.sesConfig.encrypt || false;
    if (isEncrypt) {
      data = { encrypt: await encrypt(data) };
    }
    const key =
      type === "file"
        ? sid.replace(SessionModifier.sesConfig.prefix || "sess:", "")
        : sid;
    await SessionModifier.store.put(
      key,
      data,
      SessionModifier.sesConfig.lifetime * 60
    );
  }

  private async loadSession(sid: string) {
    const key =
      SessionModifier.sesConfig.driver === "file"
        ? sid.replace(SessionModifier.sesConfig.prefix || "sess:", "")
        : sid;
    const isEncrypt = SessionModifier.sesConfig.encrypt || false;
    const data = await SessionModifier.store.get(key);
    if (!isset(data)) {
      return {};
    }
    if (isEncrypt) {
      const decryptedData = await decrypt(data as string);
      if (decryptedData === null) {
        throw new Error("Failed to decrypt session data");
      }
      return decryptedData;
    } else {
      return data;
    }
  }
}

function resolveAppKey(rawKey: string, keyBytes: number): Uint8Array {
  if (rawKey.startsWith("base64:")) {
    const decoded = Uint8Array.from(atob(rawKey.slice(7)), (c) =>
      c.charCodeAt(0)
    );
    return decoded.slice(0, keyBytes);
  }

  const encoder = new TextEncoder();
  return encoder.encode(rawKey).slice(0, keyBytes);
}

export async function encrypt(data: Record<string, unknown>): Promise<string> {
  const appConfig = staticConfig("app");
  const cipher = appConfig.cipher;

  const mode = cipher.toUpperCase().includes("GCM") ? "AES-GCM" : "AES-CBC";
  const ivLength = mode === "AES-GCM" ? 12 : 16;

  const iv = crypto.getRandomValues(new Uint8Array(ivLength));
  const keyMaterial = SessionInitializer.appKeys[0];
  if (!keyMaterial) {
    throw new Error("No app key available for encryption");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: mode },
    false,
    ["encrypt"]
  );

  const encoded = new TextEncoder().encode(JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt(
    { name: mode, iv },
    key,
    encoded
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return uint8ArrayToBase64(combined);
}

export async function decrypt(
  data: string
): Promise<Record<string, unknown> | null> {
  const appConfig = staticConfig("app");
  const keys = SessionInitializer.appKeys;
  const cipher = appConfig.cipher;

  if (!cipher) throw new Error("Missing cipher in configuration");

  const mode = cipher.toUpperCase().includes("GCM") ? "AES-GCM" : "AES-CBC";
  const ivLength = mode === "AES-GCM" ? 12 : 16;

  const rawData = base64ToUint8Array(data);
  const iv = rawData.slice(0, ivLength);
  const encryptedContent = rawData.slice(ivLength);

  for (const keyMaterial of keys) {
    try {
      const key = await crypto.subtle.importKey(
        "raw",
        keyMaterial,
        { name: mode },
        false,
        ["decrypt"]
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: mode, iv },
        key,
        encryptedContent
      );
      const decoded = new TextDecoder().decode(decrypted);
      return JSON.parse(decoded);
    } catch {
      continue;
    }
  }

  return null;
}

export class SessionInitializer {
  public static appKeys: Uint8Array[] = [];

  public static async init() {
    // Initialize app keys for encryption
    const appConfig = staticConfig("app");
    const cipher = appConfig.cipher || "AES-256-CBC";
    const keySize = parseInt(cipher.match(/AES-(\d+)-/)?.[1] || "256", 10);
    const keyBytes = keySize / 8;
    const keys = [appConfig.key, ...(appConfig.previous_keys || [])]
      .filter((k) => isset(k) && !empty(k) && isString(k))
      .map((k) => resolveAppKey(k, keyBytes));
    if (keys.length === 0) {
      throw new Error(
        "APP_KEY is not set. Please set it in your environment variables."
      );
    }
    this.appKeys = keys;
  }
}
