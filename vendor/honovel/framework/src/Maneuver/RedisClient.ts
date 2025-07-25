import { Redis as IORedis } from "ioredis";
import {
  Redis as UpstashRedis,
  RedisConfigDeno,
} from "https://deno.land/x/upstash_redis@v1.14.0/mod.ts";

import { createClient } from "npm:redis";

import {
  connect,
  Redis as DenoRedis,
} from "https://deno.land/x/redis@v0.29.4/mod.ts";
import { RedisConfigure } from "configs/@types/index.d.ts";

async function connectToRedis(
  config: RedisConfigure<"deno-redis">
): Promise<DenoRedis> {
  return await connect({
    hostname: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    username: config.username,
    tls: config.tls,
    ...config.options, // merge additional options
  });
}

// for session intended
export default class RedisClient {
  static #client: unknown | null = null;
  private static redisType:
    | "ioredis"
    | "upstash"
    | "node-redis"
    | "deno-redis" = "ioredis";
  public static setClientUsed(
    client: "ioredis" | "upstash" | "node-redis" | "deno-redis"
  ) {
    this.redisType = client;
  }
  static async init(connection: string = "default") {
    const redisClient = this.redisType;
    const redisConfig = staticConfig("database").redis;
    if (!isset(redisConfig)) {
      throw new Error("Redis configuration is not set in the database config.");
    }
    const connections = redisConfig.connections;
    if (!isset(connections[connection])) {
      throw new Error(
        `Redis connection "${connection}" is not defined in the database config.`
      );
    }

    switch (redisClient) {
      case "ioredis": {
        const config = connections[connection] as RedisConfigure<"ioredis">;
        this.#client = new IORedis(config.ioredisUrl);
        break;
      }
      case "upstash": {
        const config = connections[connection] as RedisConfigure<"upstash">;
        this.#client = new UpstashRedis({
          url: config.upstashUrl,
          token: config.upstashToken,
        });
        break;
      }
      case "node-redis": {
        const config = connections[connection] as RedisConfigure<"node-redis">;
        this.#client = createClient({
          url: config.nodeRedisUrl,
        });
        break;
      }
      case "deno-redis": {
        const config = connections[connection] as RedisConfigure<"deno-redis">;
        this.#client = await connectToRedis(config);
        break;
      }
      default: {
        throw new Error(
          `Unsupported Redis client: ${redisClient}. Supported clients are: ioredis, upstash, node-redis, deno-redis.`
        );
      }
    }
  }

  public static async set(
    key: string,
    value: string,
    options?: { ex?: number }
  ) {
    const redisClient = this.redisType;
    if (empty(env("REDIS_CLIENT", "")))
      console.warn("REDIS_CLIENT is not set, defaulting to ioredis.");
    if (!this.#client) {
      throw new Error("Redis client is not initialized. Call init() first.");
    }
    if (redisClient === "ioredis") {
      if (options?.ex) {
        await (this.#client as IORedis).set(key, value, "EX", options.ex);
      } else {
        await (this.#client as IORedis).set(key, value);
      }
    } else if (redisClient === "upstash") {
      await (this.#client as UpstashRedis).set(
        key,
        value,
        options?.ex ? { ex: options.ex } : undefined
      );
    } else if (redisClient === "node-redis") {
      await (this.#client as ReturnType<typeof createClient>).set(
        key,
        value,
        options?.ex ? { EX: options.ex } : undefined
      );
    } else if (redisClient === "deno-redis") {
      await (this.#client as DenoRedis).set(key, value, options);
    } else {
      throw new Error(
        `Unsupported Redis client: ${redisClient}. Supported clients are: ioredis, upstash, node-redis.`
      );
    }
  }

  public static async get(key: string): Promise<string | null> {
    const redisClient = this.redisType;
    if (!this.#client) {
      throw new Error("Redis client is not initialized. Call init() first.");
    }
    if (redisClient === "ioredis") {
      return await (this.#client as IORedis).get(key);
    } else if (redisClient === "upstash") {
      return await (this.#client as UpstashRedis).get(key);
    } else if (redisClient === "node-redis") {
      return await (this.#client as ReturnType<typeof createClient>).get(key);
    } else if (redisClient === "deno-redis") {
      return await (this.#client as DenoRedis).get(key);
    } else {
      throw new Error(
        `Unsupported Redis client: ${redisClient}. Supported clients are: ioredis, upstash, node-redis.`
      );
    }
  }

  public static async del(key: string): Promise<number> {
    const redisClient = this.redisType;
    if (!this.#client) {
      throw new Error("Redis client is not initialized. Call init() first.");
    }
    if (redisClient === "ioredis") {
      return await (this.#client as IORedis).del(key);
    } else if (redisClient === "upstash") {
      return await (this.#client as UpstashRedis).del(key);
    } else if (redisClient === "node-redis") {
      return await (this.#client as ReturnType<typeof createClient>).del(key);
    } else if (redisClient === "deno-redis") {
      return await (this.#client as DenoRedis).del(key);
    } else {
      throw new Error(
        `Unsupported Redis client: ${redisClient}. Supported clients are: ioredis, upstash, node-redis.`
      );
    }
  }
}
