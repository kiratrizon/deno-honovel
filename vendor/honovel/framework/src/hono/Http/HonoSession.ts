import { MiddlewareHandler } from "hono";
import * as path from "https://deno.land/std/path/mod.ts";

import { ISession } from "../../../../@types/declaration/ISession.d.ts";
import { Str } from "Illuminate/Support";
import { getMyCookie, setMyCookie } from "./HonoCookie.ts";
import { deleteCookie } from "hono/cookie";
import RedisClient from "../../Maneuver/RedisClient.ts";
import { Migration } from "Illuminate/Database/Migrations";
import { Schema, DB } from "Illuminate/Support/Facades";
import { Carbon } from "honovel:helpers";
import { init } from "https://deno.land/x/base64@v0.2.1/base.ts";
import { SessionConfig } from "../../../../../../config/@types/index.d.ts";

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
    await saveSession(this.id, this.values);
  }

  public update(values: Record<string, NonFunction<unknown>>) {
    this.values = { ...this.values, ...values };
  }
}

export class Session {
  #id: string | null = null;
  constructor(private values: Record<string, NonFunction<unknown>> = {}) {}
  public put(key: string, value: NonFunction<unknown>) {
    this.values[key] = value;
  }

  public get(
    key: string,
    defaultValue: NonFunction<unknown> | null = null
  ): NonFunction<unknown> | null {
    return this.values[key] ?? defaultValue;
  }

  public has(key: string): boolean {
    return keyExist(this.values, key);
  }
  public forget(key: string) {
    delete this.values[key];
  }

  protected updateValues(values: Record<string, NonFunction<unknown>>) {
    this.values = values;
  }

  protected updateId(id: string) {
    this.#id = id;
  }

  public getId() {
    return this.#id;
  }

  public all(): Record<string, NonFunction<unknown>> {
    return { ...this.values };
  }

  public flush() {
    this.values = {};
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

    this.#value = await loadSession(this.#sessionId);
    this.#c.set("HonoSession", new HonoSession(this.#sessionId, this.#value));
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
    await deleteSession(this.#sessionId);

    this.#c.set("logged_out", true);
    this.#started = false;
  }
}

async function saveSession(sid: string, data: Record<string, unknown>) {
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
      if (staticConfig("database").default === "sqlite") {
        // SQLite requires a different handling for upsert
        const dataExists = await DB.select(
          `SELECT sid FROM ${tableSession} WHERE sid = ?`,
          [sid]
        );
        if (dataExists.length > 0) {
          await DB.statement(
            `UPDATE ${tableSession} SET data = ?, expires = ? WHERE sid = ?`,
            [dataToString, expires, sid]
          );
        } else {
          await DB.insertOrUpdate(
            tableSession,
            {
              sid,
              data: dataToString,
              expires,
            },
            ["sid"]
          );
        }
      } else {
        await DB.insertOrUpdate(
          tableSession,
          {
            sid,
            data: dataToString,
            expires,
          },
          ["sid"]
        );
      }
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

async function loadSession(sid: string) {
  const type = SessionModifier.sesConfig.driver || "file";
  const isEncrypt = SessionModifier.sesConfig.encrypt || false;
  switch (type) {
    case "file": {
      const pathDefault: string =
        SessionModifier.sesConfig.files || storagePath("framework/sessions");
      const filePath = path.join(
        pathDefault,
        `${sid.replace(SessionModifier.sesConfig.prefix || "sess:", "")}.json`
      );
      if (pathExist(filePath)) {
        const content = getFileContents(filePath);
        const data = jsonDecode(content);
        if (isEncrypt) {
          const encryptedData = (data as SessionEncrypt)["encrypt"];
          return await decrypt(encryptedData);
        }
        return data;
      }
      return {};
    }
    case "redis": {
      const raw = await RedisClient.get(sid);
      if (raw) {
        const data = isString(raw) ? JSON.parse(raw) : raw;
        if (isEncrypt) {
          const encryptedData = (data as SessionEncrypt)["encrypt"];
          return await decrypt(encryptedData);
        }
        return data;
      }
      return {};
    }
    case "memory": {
      return HonoSessionMemory.sessions[sid] || {};
    }
    case "database": {
      const tableSession = SessionModifier.sesConfig.table || "sessions";
      const now = Carbon.now();
      const data = await DB.select(
        `SELECT data FROM ${tableSession} WHERE sid = ? and expires > ?`,
        [sid, now]
      );
      if (data.length > 0) {
        const sessionData = data[0].data as string;
        if (isEncrypt) {
          const encryptedData = (jsonDecode(sessionData) as SessionEncrypt)[
            "encrypt"
          ];
          return await decrypt(encryptedData);
        }
        return jsonDecode(sessionData);
      }
      return {};
    }
    default: {
      throw new Error(`Unsupported session driver: ${type}`);
    }
  }
}

async function deleteSession(sid: string) {
  const type = SessionModifier.sesConfig.driver || "file";

  switch (type) {
    case "file": {
      const pathDefault: string =
        SessionModifier.sesConfig.files || storagePath("framework/sessions");
      const filePath = path.join(
        pathDefault,
        `${sid.replace(SessionModifier.sesConfig.prefix || "sess:", "")}.json`
      );
      if (pathExist(filePath)) {
        await Deno.remove(filePath);
      }
      break;
    }
    case "redis": {
      await RedisClient.del(sid);
      break;
    }
    case "memory": {
      delete HonoSessionMemory.sessions[sid];
      break;
    }
    case "database": {
      const tableSession = SessionModifier.sesConfig.table || "sessions";
      await DB.statement(`DELETE FROM ${tableSession} WHERE sid = ?`, [sid]);
      break;
    }
    default: {
      throw new Error(`Unsupported session driver: ${type}`);
    }
  }
}

function resolveAppKey(rawKey: string, keyBytes: number): Uint8Array {
  let keyData = rawKey;

  if (keyData.startsWith("base64:")) {
    keyData = atob(keyData.slice(7)); // Decode base64 to binary string
  }

  const encoder = new TextEncoder();
  return encoder.encode(keyData).slice(0, keyBytes);
}

export async function encrypt(data: Record<string, unknown>): Promise<string> {
  const appConfig = staticConfig("app");
  const appKey = appConfig.key;
  const cipher = appConfig.cipher;

  if (!appKey) throw new Error("Missing app key in configuration");
  if (!cipher) throw new Error("Missing cipher in configuration");

  const mode = cipher.toUpperCase().includes("GCM") ? "AES-GCM" : "AES-CBC";
  const keySize = parseInt(cipher.match(/AES-(\d+)-/)?.[1] || "256", 10);
  const keyBytes = keySize / 8;
  const ivLength = mode === "AES-GCM" ? 12 : 16;

  const iv = crypto.getRandomValues(new Uint8Array(ivLength));
  const keyMaterial = resolveAppKey(appKey, keyBytes);

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
    const type = SessionModifier.sesConfig.driver || "file";
    switch (type) {
      case "database": {
        const tableSession = SessionModifier.sesConfig.table || "sessions";
        const migrationClass = new (class extends Migration {
          async up() {
            if (!(await Schema.hasTable(tableSession))) {
              await Schema.create(tableSession, (table) => {
                table.id();
                table.string("sid").unique();
                table.text("data");
                table.timestamp("expires");
                table.timestamps();
              });
            }
          }

          async down() {
            // await Schema.dropIfExists(tableSession);
          }
        })();
        await migrationClass.up();
        break;
      }
      case "file": {
        const pathDefault: string =
          SessionModifier.sesConfig.files || storagePath("framework/sessions");
        if (!pathExist(pathDefault)) {
          makeDir(pathDefault);
        }
        break;
      }
      case "memory": {
        // Memory session does not require initialization
        break;
      }
      case "redis": {
        await RedisClient.init();
        break;
      }
      default: {
        // do nothing
      }
    }

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

Deno.addSignalListener("SIGINT", async () => {
  console.log("Gracefully shutting down...");

  // Example: Close DB or other services
  // await db.close();

  console.log("Cleanup done. Exiting.");
});
