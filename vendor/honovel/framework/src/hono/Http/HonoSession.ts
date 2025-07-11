import { MiddlewareHandler } from "hono";
import * as path from "https://deno.land/std/path/mod.ts";

import { ISession } from "../../../../@types/declaration/ISession.d.ts";
import { Str } from "Illuminate/Support";
import { getAppKey, getMyCookie, setMyCookie } from "./HonoCookie.ts";
import { deleteCookie } from "hono/cookie";
import { SessionConfig } from "../../../../../../config/@types/index.d.ts";
import RedisClient from "../../Maneuver/RedisClient.ts";
import { Migration } from "Illuminate/Database/Migrations";
import { Schema, DB } from "Illuminate/Support/Facades";

type SessionEncrypt = {
  encrypt: string; // encrypted session data
};

interface SaveSessionConfig {
  value: Record<string, unknown>;
  isEncrypt?: boolean;
  appKey?: string;
}

interface SaveDBorRedisSessionConfig extends SaveSessionConfig {
  sid: string;
}

interface SaveFileSessionConfig extends SaveSessionConfig {
  filePath: string;
}

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
    const sessionConfig = staticConfig("session");
    const type = sessionConfig.driver || "file";
    const pathDefault: string =
      sessionConfig.files || storagePath("framework/sessions");
    const isEncrypt = sessionConfig.encrypt || false;
    const appKey = getAppKey();

    switch (type) {
      case "file": {
        await writeSessionFile({
          filePath: path.join(
            pathDefault,
            `${this.id.replace(sessionConfig.prefix || "sess:", "")}.json`
          ),
          value: this.values,
          isEncrypt,
          appKey,
        });
        break;
      }
      case "redis": {
        await writeSessionRedis({
          sid: this.id,
          value: this.values,
          isEncrypt,
          appKey,
        });
        break;
      }
      case "database":
      case "memory": {
        // For memory, we can just remove the session from the in-memory store
        if (keyExist(HonoSessionMemory.sessions, this.id)) {
          HonoSessionMemory.sessions[this.id] = {
            ...HonoSessionMemory.sessions[this.id],
            ...this.values,
          };
        } else {
          HonoSessionMemory.sessions[this.id] = this.values;
        }
        break;
      }
      // No cleanup needed for memory or database
    }
  }

  public update(values: Record<string, NonFunction<unknown>>) {
    this.values = { ...this.values, ...values };
  }
}

class Session implements ISession {
  constructor(private values: Record<string, NonFunction<unknown>> = {}) {}
  public put(key: string, value: NonFunction<unknown>) {
    this.values[key] = value;
  }

  public get(key: string): NonFunction<unknown> | null {
    return this.values[key] ?? null;
  }
  public has(key: string): boolean {
    return keyExist(this.values, key);
  }
  public forget(key: string) {
    delete this.values[key];
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

export async function sessionIdRecursive(): Promise<string> {
  const sessionConfig = staticConfig("session");
  const prefix = sessionConfig.prefix || "sess:";
  const array = crypto.getRandomValues(new Uint8Array(16));
  const sessionId =
    prefix +
    Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  return sessionId;
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

export async function dataEncryption(
  data: Record<string, unknown>,
  appKey: string
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appKey).slice(0, 32), // limit key length
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );

  const encoded = new TextEncoder().encode(jsonEncode(data));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    encoded
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return uint8ArrayToBase64(combined);
}

export async function dataDecryption(
  base64Data: string,
  appKey: string
): Promise<Record<string, unknown>> {
  const rawData = base64ToUint8Array(base64Data);
  const iv = rawData.slice(0, 16);
  const encryptedContent = rawData.slice(16);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appKey).slice(0, 32), // limit key length
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    key,
    encryptedContent
  );

  const decoded = new TextDecoder().decode(decrypted);
  return JSON.parse(decoded);
}

async function writeSessionRedis({
  sid,
  value,
  isEncrypt = false,
  appKey = getAppKey(),
}: SaveDBorRedisSessionConfig) {
  const sessionConfig = staticConfig("session");
  let newData = jsonEncode(value);
  if (isEncrypt) {
    const encryptedContent = await dataEncryption(value, appKey);
    const stringified = jsonEncode({ encrypt: encryptedContent });
    newData = stringified;
  }
  let time = sessionConfig.lifetime || undefined;
  if (time) {
    time *= 60; // convert minutes to seconds
  }
  await RedisClient.set(sid, newData, {
    ex: time, // default to 120 minutes
  });
}

async function writeSessionFile({
  filePath,
  value,
  isEncrypt = false,
  appKey = getAppKey(),
}: SaveFileSessionConfig) {
  if (isEncrypt) {
    const encryptedContent = await dataEncryption(value, appKey);
    const rewriting = jsonEncode({
      encrypt: encryptedContent,
    });
    writeFile(filePath, rewriting);
  } else {
    writeFile(filePath, jsonEncode(value));
  }
}

export class SessionModifier {
  static #dbAlreadyMigrated: boolean = false;
  static #keyExist: boolean = false;
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

  async start() {
    if (!this.#canTouch || this.#started) return;

    const sessionConfig = staticConfig("session");
    const key = this.#getSessionCookieKey(sessionConfig);
    const appKey = getAppKey();
    const isEncrypt = !!sessionConfig.encrypt;
    const driver = sessionConfig.driver || "file";

    this.#sessionId = this.#getSessionIdFromCookie(key);
    if (!this.#sessionId) {
      this.#sessionId = await sessionIdRecursive();
      this.#setSessionCookie(key, this.#sessionId, sessionConfig);
    }

    this.#value =
      (await this.#loadSessionData(
        driver,
        this.#sessionId,
        appKey,
        isEncrypt,
        sessionConfig
      )) || {};
    this.#c.set("HonoSession", new HonoSession(this.#sessionId, this.#value));
    this.#c.set("session", new Session(this.#value));
    this.#started = true;
  }

  async end() {
    if (!this.#canTouch || !this.#sessionId) return;

    const sessionConfig = staticConfig("session");
    const key = this.#getSessionCookieKey(sessionConfig);
    const driver = sessionConfig.driver || "file";

    this.#clearSessionCookie(key, sessionConfig);
    await this.#deleteSessionData(driver, this.#sessionId, sessionConfig);

    this.#c.set("logged_out", true);
    this.#started = false;
  }

  #getSessionCookieKey(sessionConfig: SessionConfig): string {
    return (
      sessionConfig.cookie || Str.snake(env("APP_NAME", "honovel") + "_session")
    );
  }

  #getSessionIdFromCookie(key: string): string {
    const sid = getMyCookie(this.#c, key) || "";
    return sid && typeof sid === "string" ? sid : "";
  }

  #setSessionCookie(key: string, sid: string, sessionConfig: SessionConfig) {
    setMyCookie(this.#c, key, sid, {
      maxAge: (sessionConfig.lifetime ?? 120) * 60,
      sameSite: sessionConfig.sameSite ?? "lax",
      httpOnly: sessionConfig.httpOnly ?? true,
      path: sessionConfig.path ?? "/",
      secure: sessionConfig.secure ?? false,
    });
  }

  #clearSessionCookie(key: string, sessionConfig: SessionConfig) {
    deleteCookie(this.#c, key, {
      maxAge: 0,
      sameSite: sessionConfig.sameSite ?? "lax",
      httpOnly: sessionConfig.httpOnly ?? true,
      path: sessionConfig.path ?? "/",
      secure: sessionConfig.secure ?? false,
    });
  }

  async #loadSessionData(
    driver: string,
    sid: string,
    appKey: string,
    isEncrypt: boolean,
    config: SessionConfig
  ) {
    switch (driver) {
      case "file":
        return await this.#loadFromFile(sid, appKey, isEncrypt, config);
      case "redis":
        return await this.#loadFromRedis(sid, appKey, isEncrypt);
      case "memory":
        return (
          HonoSessionMemory.sessions[sid] ??
          (HonoSessionMemory.sessions[sid] = {})
        );
      case "database":
        return await this.#loadFromDatabase(sid, appKey, isEncrypt);
      default:
        return {};
    }
  }

  // deno-lint-ignore no-explicit-any
  async #deleteSessionData(driver: string, sid: string, config: any) {
    switch (driver) {
      case "file": {
        const filePath = path.join(
          config.files || storagePath("framework/sessions"),
          `${sid.replace(config.prefix || "sess:", "")}.json`
        );
        if (pathExist(filePath)) await Deno.remove(filePath);
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
        const tableSession = config.table || "sessions";
        await DB.statement(`DELETE FROM ${tableSession} WHERE sid = ?`, [sid]);
        break;
      }
    }
  }

  async #loadFromFile(
    sid: string,
    appKey: string,
    isEncrypt: boolean,
    config: SessionConfig
  ) {
    const dir = config.files || storagePath("framework/sessions");
    const filePath = path.join(
      dir,
      `${sid.replace(config.prefix || "sess:", "")}.json`
    );

    if (!pathExist(dir)) makeDir(dir);

    if (SessionModifier.#keyExist || pathExist(filePath)) {
      try {
        const content = getFileContents(filePath);
        const data = jsonDecode(content);
        if (!isEncrypt) {
          return data;
        }
        const encryptedData = (data as SessionEncrypt)["encrypt"];
        return await dataDecryption(encryptedData, appKey);
      } catch {
        return {};
      }
    } else {
      await writeSessionFile({ filePath, value: {}, isEncrypt, appKey });
      SessionModifier.#keyExist = true;
      return {};
    }
  }

  async #loadFromRedis(sid: string, appKey: string, isEncrypt: boolean) {
    const raw = await RedisClient.get(sid);
    const data = isString(raw) ? JSON.parse(raw) : raw;
    if (data) {
      try {
        if (!isEncrypt) {
          return data;
        }
        const encryptedData = (data as SessionEncrypt)["encrypt"];
        return await dataDecryption(encryptedData, appKey);
      } catch {
        return {};
      }
    } else {
      await writeSessionRedis({ sid, value: {}, isEncrypt, appKey });
      return {};
    }
  }

  async #loadFromDatabase(sid: string, appKey: string, isEncrypt: boolean) {
    // Not implemented yet

    const tableSession = staticConfig("session").table || "sessions";
    const schemaClass = new (class extends Migration {
      async up() {
        // Implement the migration logic here
        if (!(await Schema.hasTable(tableSession))) {
          await Schema.create(tableSession, (table) => {
            table.id();
            table.string("sid").unique();
            table.text("data");
            table.timestamps();
          });
        }
      }

      async down() {
        // Implement the rollback logic here
      }
    })();

    if (!SessionModifier.#dbAlreadyMigrated) {
      await schemaClass.up();
      SessionModifier.#dbAlreadyMigrated = true;
    }

    // Fetch the session data from the database
    const data = await DB.select(
      `SELECT data FROM ${tableSession} WHERE sid = ?`,
      [sid]
    );
    if (data.length > 0) {
      const sessionData = data[0].data as string;
      if (!isEncrypt) {
        return jsonDecode(sessionData);
      }
      const encryptedData = (jsonDecode(sessionData) as SessionEncrypt)[
        "encrypt"
      ];
      return await dataDecryption(encryptedData, appKey);
    } else {
      // If session does not exist, create a new one
      await DB.insert(tableSession, {
        sid,
        data: isEncrypt
          ? jsonEncode({ encrypt: await dataEncryption({}, appKey) })
          : jsonEncode({}),
      });
      return {};
    }
  }
}

Deno.addSignalListener("SIGINT", async () => {
  console.log("Gracefully shutting down...");

  // Example: Close DB or other services
  // await db.close();

  console.log("Cleanup done. Exiting.");
});
