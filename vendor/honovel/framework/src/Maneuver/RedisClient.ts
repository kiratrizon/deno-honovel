import { Redis as IORedis } from "ioredis";
import {
  Redis as UpstashRedis,
} from "https://deno.land/x/upstash_redis@v1.14.0/mod.ts";

import { createClient } from "npm:redis";

import {
  connect,
  Redis as DenoRedis,
} from "https://deno.land/x/redis@v0.29.4/mod.ts";
import { RedisConfigure } from "configs/@types/index.d.ts";
import { RedisManager } from "Illuminate/Redis/index.ts";

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
  static #client: RedisManager;
  static init(client: RedisManager) {
    this.#client = client;
  }

  static async set(key: string, value: string, options: { ex?: number }): Promise<void> {
    if (this.#client) {
      return await this.#client.set(key, value, options);
    }
    throw new Error("Redis client is not initialized.");
  }

  static async get(key: string): Promise<string | null> {
    if (this.#client) {
      return await this.#client.get(key);
    }
    throw new Error("Redis client is not initialized.");
  }

  static async del(key: string): Promise<number> {
    if (this.#client) {
      return await this.#client.del(key);
    }
    throw new Error("Redis client is not initialized.");
  }
  static async exists(key: string): Promise<boolean> {
    if (this.#client) {
      return await this.#client.exists(key);
    }
    throw new Error("Redis client is not initialized.");
  }


}
