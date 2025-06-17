import { MiddlewareHandler } from "hono";
import { setSignedCookie, getSignedCookie } from "hono/cookie";
import * as path from "https://deno.land/std/path/mod.ts";
import {
  connect,
  RedisCommands,
} from "https://deno.land/x/redis@v0.29.4/mod.ts";
import {
  Redis as UpstashRedis,
  RedisConfigDeno,
} from "https://deno.land/x/upstash_redis@v1.14.0/mod.ts";

import { Redis as IORedis } from "ioredis";
import { SessionContract } from "../../@hono-types/declaration/ISession.d.ts";

export interface SessionConfig {
  // session lifetime in minutes
  driver: "file" | "redis" | "database" | "memory";
  lifetime: number;
  encrypt: boolean; // whether to encrypt session data
  files: string; // path to session files (if file driver)
  cookie: string; // session cookie name
  path: string; // cookie path
  domain: string | null; // cookie domain (nullable)
  secure: boolean; // send cookie only over HTTPS
  httpOnly: boolean; // cookie not accessible via JS
  sameSite: "lax" | "strict" | "none"; // sameSite policy
  connection: string; // connection name for redis/db
  prefix: string; // prefix for cache/redis keys
}

type SessionEncrypt = {
  encrypt: string; // encrypted session data
};

interface RedisConnection {
  host: string;
  port: number;
  password: string;
  db?: number;
  url?: string | null;
  upstash?: RedisConfigDeno;
}

export interface RedisConfig {
  default: string;
  connections: {
    [key: string]: RedisConnection;
  };
}

// Recursive type to exclude functions from any nested property
// deno-lint-ignore no-explicit-any
type NonFunction<T> = T extends (...args: any[]) => any
  ? never // exclude functions
  : T extends object
  ? { [K in keyof T]: NonFunction<T[K]> }
  : T;

export class HonoSession<
  T extends Record<string, unknown> = Record<string, unknown>
> {
  public id: string;
  values: Record<string, NonFunction<unknown>>;
  constructor(id: string, values: Record<string, NonFunction<unknown>>) {
    this.id = id;
    this.values = values;
  }
  public async dispose() {
    const sessionConfig = staticConfig("session") as SessionConfig;
    const type = sessionConfig.driver || "file";
    const pathDefault: string =
      sessionConfig.files || storagePath("framework/sessions");
    const isEncrypt = sessionConfig.encrypt || false;
    const appKey = getAppKey();

    switch (type) {
      case "file": {
        await writeSessionFile({
          filePath: path.join(pathDefault, `${this.id}.json`),
          value: this.values,
          isEncrypt,
          appKey,
        });
        break;
      }
      case "redis": {
        if (isset(MyRedis.client)) {
          await writeSessionRedis({
            sid: this.id,
            value: this.values,
            isEncrypt,
            appKey,
          });
        }
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

class Session implements SessionContract {
  constructor(private values: Record<string, NonFunction<unknown>> = {}) {}
  public put(key: string, value: NonFunction<unknown>) {
    this.values[key] = value;
  }

  public get(key: string): NonFunction<unknown> | null {
    return this.values[key] || null;
  }
  public has(key: string): boolean {
    return keyExist(this.values, key);
  }
  public forget(key: string) {
    delete this.values[key];
  }
}

class MyRedis {
  public static client: RedisCommands | IORedis | UpstashRedis;

  public static setClient(client: RedisCommands | IORedis | UpstashRedis) {
    MyRedis.client = client;
  }

  public static async set(
    key: string,
    value: string,
    options?: { ex?: number }
  ) {
    if (!isset(MyRedis.client)) {
      throw new Error("Redis client is not set");
    }
    const ex = options?.ex ?? 120 * 60;
    if (MyRedis.client instanceof UpstashRedis) {
      await MyRedis.client.set(key, value, { ex });
    } else if (MyRedis.client instanceof IORedis) {
      await MyRedis.client.set(key, value, "EX", ex); // default to 120 minutes
    } else {
      await (MyRedis.client as RedisCommands).set(key, value, {
        ex,
      });
    }
  }

  public static async get(key: string): Promise<string | null> {
    if (!isset(MyRedis.client)) {
      throw new Error("Redis client is not set");
    }
    if (MyRedis.client instanceof UpstashRedis) {
      return await MyRedis.client.get(key);
    } else if (MyRedis.client instanceof IORedis) {
      return await MyRedis.client.get(key);
    } else {
      return await (MyRedis.client as RedisCommands).get(key);
    }
  }

  public static async exists(key: string): Promise<number> {
    if (!isset(MyRedis.client)) {
      throw new Error("Redis client is not set");
    }
    return await MyRedis.client.exists(key);
  }
}

class HonoSessionMemory {
  public static sessions: Record<string, Record<string, unknown>> = {};
}

export function honoSession(): MiddlewareHandler {
  return async (c, next) => {
    // deno-lint-ignore no-explicit-any
    let value: Record<string, NonFunction<any>> = {};
    if (c.get("from_web")) {
      const appKey = getAppKey();
      let sid;
      const gSid = (await getSignedCookie(c, appKey, "sid")) || "";
      try {
        if (isset(gSid) && !empty(gSid)) {
          sid = jsonDecode(gSid);
        }
      } catch (_e) {
        sid = gSid;
      }

      const sessionConfig = staticConfig("session") as SessionConfig;
      const isEncrypt = sessionConfig.encrypt || false;

      // getting sid
      if (!isset(sid) || empty(sid) || !sid || !isString(sid)) {
        const sessionId = await sessionIdRecursive();
        await setSignedCookie(c, "sid", jsonEncode(sessionId), appKey, {
          maxAge: (sessionConfig.lifetime || 120) * 60,
          sameSite: sessionConfig.sameSite || "lax",
          httpOnly: sessionConfig.httpOnly || true,
          path: sessionConfig.path || "/",
          secure: sessionConfig.secure || false,
        });

        sid = sessionId;
      }
      // sid is validated store the session with value
      if (isset(sid) && !empty(sid) && sid) {
        const pathDefault: string =
          sessionConfig.files || storagePath("framework/sessions");
        // deno-lint(no-case-declarations)
        switch (sessionConfig.driver || "file") {
          case "file": {
            if (!pathExist(pathDefault)) {
              makeDir(pathDefault);
            }
            const filePath = path.join(pathDefault, `${sid}.json`);
            if (pathExist(filePath)) {
              try {
                const data = JSON.parse(await Deno.readTextFile(filePath));
                if (isEncrypt) {
                  value = await dataDecryption(
                    (data as SessionEncrypt)["encrypt"],
                    appKey
                  );
                } else {
                  value = data;
                }
              } catch (e) {
                console.error("Failed to parse session data:", e);
                value = {};
              }
            } else {
              await writeSessionFile({
                filePath,
                value,
                isEncrypt,
                appKey,
              });
            }
            break;
          }
          case "redis": {
            const redisConfig = staticConfig("redis") as RedisConfig;
            const connectionName = sessionConfig.connection || "default";
            if (!redisConfig) {
              throw new Error("Redis configuration not found");
            }
            // use url first
            const redisConnection = redisConfig.connections[connectionName];
            if (!isset(redisConnection)) {
              throw new Error(`Redis connection "${connectionName}" not found`);
            }
            if (!isset(MyRedis.client)) {
              await createRedisConnection(redisConnection);
            }
            const redisData = (await MyRedis.client.get(sid)) as
              | Record<string, unknown>
              | string
              | null;
            const data = isString(redisData)
              ? JSON.parse(redisData)
              : redisData;
            if (isset(data)) {
              try {
                if (isEncrypt) {
                  value = await dataDecryption(
                    (data as SessionEncrypt)["encrypt"],
                    appKey
                  );
                } else {
                  value = data;
                }
              } catch (_e) {
                value = {};
              }
            } else {
              await writeSessionRedis({
                sid,
                value,
                isEncrypt,
                appKey,
              });
            }
            break;
          }
          case "database": {
            // For database, we would typically use an ORM or direct SQL queries
          }
          case "memory": {
            // For memory, we can use a simple in-memory store
            // Note: This is not persistent and will be lost on server restart
            // For production, use file or redis
            if (keyExist(HonoSessionMemory.sessions, sid)) {
              value = HonoSessionMemory.sessions[sid];
            } else {
              HonoSessionMemory.sessions[sid] = value;
            }
            break;
          }
        }
        c.set("session", new HonoSession(sid, value));
      }
    }
    c.set("sessionInstance", new Session(value));
    await next();
  };
}

export function getAppKey(): Uint8Array {
  const key = env("APP_KEY");
  if (!key) throw new Error("APP_KEY is not defined in environment");

  if (key.startsWith("base64:")) {
    const base64Key = key.slice(7);
    return base64ToUint8Array(base64Key);
  }

  // If not base64, just encode string (not recommended)
  return new TextEncoder().encode(key);
}

async function sessionIdRecursive(): Promise<string> {
  const sessionConfig = staticConfig("session") as SessionConfig;
  const type = sessionConfig.driver || "file";
  let sessionId: string;
  const prefix = sessionConfig.prefix || "sess:";
  const pathDefault: string =
    sessionConfig.files || storagePath("framework/sessions");
  switch (type) {
    case "file": {
      if (!pathExist(pathDefault)) {
        makeDir(pathDefault);
      }
      do {
        const array = crypto.getRandomValues(new Uint8Array(16));
        sessionId =
          prefix +
          Array.from(array)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
      } while (
        pathExist(path.join(pathDefault, `${sessionId}.json`)) ||
        !isset(sessionId)
      );
      return sessionId;
    }
    case "redis": {
      const redisConfig = staticConfig("redis") as RedisConfig;
      const connectionName = sessionConfig.connection || "default";
      const redisConnection = redisConfig.connections[connectionName];
      if (!isset(redisConnection)) {
        throw new Error(`Redis connection "${connectionName}" not found`);
      }
      if (!isset(MyRedis.client)) {
        await createRedisConnection(redisConnection);
      }

      do {
        const array = crypto.getRandomValues(new Uint8Array(16));
        sessionId =
          prefix +
          Array.from(array)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
      } while ((await MyRedis.exists(sessionId)) || !isset(sessionId));
      return sessionId;
    }

    case "database": {
      break;
    }
    case "memory": {
      do {
        const array = crypto.getRandomValues(new Uint8Array(16));
        sessionId =
          prefix +
          Array.from(array)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
      } while (
        keyExist(HonoSessionMemory.sessions, sessionId) ||
        !isset(sessionId)
      );
      return sessionId;
    }
  }
  throw new Error(`Unsupported session driver: ${type}`);
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
  appKey: Uint8Array
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    appKey,
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
  appKey: Uint8Array
): Promise<Record<string, unknown>> {
  const rawData = base64ToUint8Array(base64Data);
  const iv = rawData.slice(0, 16);
  const encryptedContent = rawData.slice(16);
  const key = await crypto.subtle.importKey(
    "raw",
    appKey,
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

function parseUpstashEnv(obj: {
  host: string;
  password: string;
  port: number;
  db?: number;
}) {
  const rawHost = obj.host || "";
  const rawPassword = obj.password || "";
  const rawPort = obj.port || 6379;

  let tls = false;
  if (rawHost.startsWith("tls://") || rawHost.startsWith("rediss://")) {
    tls = true;
  }
  // Remove protocol (tls://) from host
  const hostname = rawHost
    .replace(/^tls:\/\//, "")
    .replace(/^rediss:\/\//, "")
    .replace(/^redis:\/\//, "");

  // According to your data, REDIS_PASSWORD holds port, REDIS_PORT holds password (token)
  // Swap these to proper variables
  const port = Number(rawPort); // 6379
  const password = rawPassword; // the long token string

  return { hostname, port, password, db: obj.db, tls };
}

async function createRedisConnection(redisConnection: RedisConnection) {
  if (
    isset(redisConnection.upstash) &&
    isObject(redisConnection.upstash) &&
    Object.entries(redisConnection.upstash).every(
      ([, value]) => isset(value) && !empty(value)
    )
  ) {
    MyRedis.setClient(new UpstashRedis(redisConnection.upstash));
  } else if (
    isset(redisConnection.url) &&
    !empty(redisConnection.url) &&
    isString(redisConnection.url)
  ) {
    MyRedis.setClient(new IORedis(redisConnection.url));
  } else {
    const connectRedis = parseUpstashEnv(redisConnection);
    MyRedis.setClient(await connect(connectRedis));
  }
  if (!isset(MyRedis.client)) {
    throw new Error("Failed to connect to Redis");
  }
}

async function writeSessionRedis({
  sid,
  value,
  isEncrypt = false,
  appKey = getAppKey(),
}: {
  sid: string;
  value: Record<string, unknown>;
  isEncrypt?: boolean;
  appKey?: Uint8Array;
}) {
  const sessionConfig = staticConfig("session") as SessionConfig;
  if (isEncrypt) {
    const encryptedContent = await dataEncryption(value, appKey);
    const stringified = jsonEncode({ encrypt: encryptedContent });
    await MyRedis.set(sid, stringified, {
      ex: (sessionConfig.lifetime || 120) * 60, // default to 120 minutes
    });
  } else {
    await MyRedis.set(sid, jsonEncode(value), {
      ex: (sessionConfig.lifetime || 120) * 60, // default to 120 minutes
    });
  }
}

async function writeSessionFile({
  filePath,
  value,
  isEncrypt = false,
  appKey = getAppKey(),
}: {
  filePath: string;
  value: Record<string, unknown>;
  isEncrypt?: boolean;
  appKey?: Uint8Array;
}) {
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

Deno.addSignalListener("SIGINT", async () => {
  console.log("Gracefully shutting down...");

  // Example: Close DB or other services
  // await db.close();

  console.log("Cleanup done. Exiting.");
  Deno.exit();
});
