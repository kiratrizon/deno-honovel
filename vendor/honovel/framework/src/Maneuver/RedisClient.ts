import { Redis as IORedis } from "ioredis";
import {
  Redis as UpstashRedis,
  RedisConfigDeno,
} from "https://deno.land/x/upstash_redis@v1.14.0/mod.ts";

import { createClient } from "npm:redis";

export default class RedisClient {
  static #client: unknown | null = null;

  static async init() {
    const redisClient = env("REDIS_CLIENT", "ioredis");
    if (redisClient === "ioredis") {
      const urlParam = env("REDIS_URL", "");
      if (empty(urlParam)) {
        throw new Error("REDIS_URL is not set in the environment variables.");
      }
      this.#client = new IORedis(urlParam);
    } else if (redisClient === "upstash") {
      const urlParam = env("UPSTASH_REDIS_REST_URL", "");
      const tokenParam = env("UPSTASH_REDIS_REST_TOKEN", "");
      if (empty(urlParam) || empty(tokenParam)) {
        throw new Error(
          "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set in the environment variables."
        );
      }
      this.#client = new UpstashRedis({
        url: urlParam,
        token: tokenParam,
      });
    } else if (redisClient === "node-redis") {
      const urlParam = env("REDIS_URL", "");
      if (empty(urlParam)) {
        throw new Error("REDIS_URL is not set in the environment variables.");
      }
      this.#client = createClient({
        url: urlParam,
      });
      await (this.#client as ReturnType<typeof createClient>).connect();
    } else {
      throw new Error(
        `Unsupported Redis client: ${redisClient}. Supported clients are: ioredis, upstash, node-redis.`
      );
    }
  }

  public static async set(
    key: string,
    value: string,
    options?: { ex?: number }
  ) {
    const redisClient = env("REDIS_CLIENT", "ioredis");
    if (empty(env("REDIS_CLIENT", ""))) console.warn("REDIS_CLIENT is not set, defaulting to ioredis.");
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
    } else {
      throw new Error(
        `Unsupported Redis client: ${redisClient}. Supported clients are: ioredis, upstash, node-redis.`
      );
    }
  }

  public static async get(key: string): Promise<string | null> {
    const redisClient = env("REDIS_CLIENT", "ioredis");
    if (!this.#client) {
      throw new Error("Redis client is not initialized. Call init() first.");
    }
    if (redisClient === "ioredis") {
      return await (this.#client as IORedis).get(key);
    } else if (redisClient === "upstash") {
      return await (this.#client as UpstashRedis).get(key);
    } else if (redisClient === "node-redis") {
      return await (this.#client as ReturnType<typeof createClient>).get(key);
    } else {
      throw new Error(
        `Unsupported Redis client: ${redisClient}. Supported clients are: ioredis, upstash, node-redis.`
      );
    }
  }

  public static async del(key: string): Promise<number> {
    const redisClient = env("REDIS_CLIENT", "ioredis");
    if (!this.#client) {
      throw new Error("Redis client is not initialized. Call init() first.");
    }
    if (redisClient === "ioredis") {
      return await (this.#client as IORedis).del(key);
    } else if (redisClient === "upstash") {
      return await (this.#client as UpstashRedis).del(key);
    } else if (redisClient === "node-redis") {
      return await (this.#client as ReturnType<typeof createClient>).del(key);
    } else {
      throw new Error(
        `Unsupported Redis client: ${redisClient}. Supported clients are: ioredis, upstash, node-redis.`
      );
    }
  }
}
