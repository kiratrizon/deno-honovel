import { Redis as IORedis } from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";
import { createClient, RedisClientType } from "redis";
import { connect, Redis as DenoRedis } from "deno-redis";
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
    ...config.options,
  });
}

export class RedisManager {
  #client: IORedis | UpstashRedis | RedisClientType | DenoRedis | null = null;
  #redisType: "ioredis" | "upstash" | "node-redis" | "deno-redis";

  constructor(
    redisType: "ioredis" | "upstash" | "node-redis" | "deno-redis" = "ioredis"
  ) {
    this.#redisType = redisType;
  }

  public async init(connection?: string) {
    const redisConfig = config("database").redis;
    if (!isset(redisConfig)) {
      throw new Error("Redis configuration is not set in the database config.");
    }
    if (!isset(connection)) {
      connection = redisConfig.default;
    }
    const connections = redisConfig.connections;
    if (!isset(connections[connection])) {
      throw new Error(`Redis connection "${connection}" is not defined.`);
    }

    const conf = connections[connection];

    switch (this.#redisType) {
      case "ioredis":
        this.#client = new IORedis(
          (conf as RedisConfigure<"ioredis">).ioredisUrl
        );
        break;
      case "upstash": {
        const upstashConf = {
          url: (conf as RedisConfigure<"upstash">).upstashUrl,
          token: (conf as RedisConfigure<"upstash">).upstashToken,
        };
        if (!upstashConf.url || !upstashConf.token) {
          throw new Error(
            "Upstash Redis configuration requires both url and token."
          );
        }
        this.#client = new UpstashRedis(upstashConf);
        break;
      }
      case "node-redis": {
        const client = createClient({
          url: (conf as RedisConfigure<"node-redis">).nodeRedisUrl,
        });
        await client.connect();
        this.#client = client as RedisClientType; // Explicitly cast to RedisClientType
        break;
      }
      case "deno-redis":
        this.#client = await connectToRedis(
          conf as RedisConfigure<"deno-redis">
        );
        break;
      default:
        throw new Error(`Unsupported Redis client: ${this.#redisType}`);
    }
  }

  public async set(key: string, value: string, options?: { ex?: number }) {
    if (!this.#client) throw new Error("Redis client not initialized.");

    switch (this.#redisType) {
      case "ioredis":
        if (options?.ex) {
          await (this.#client as IORedis).set(key, value, "EX", options.ex);
        } else {
          await (this.#client as IORedis).set(key, value);
        }
        break;
      case "upstash":
        await (this.#client as UpstashRedis).set(
          key,
          value,
          options?.ex ? { ex: options.ex } : undefined
        );
        break;
      case "node-redis":
        await (this.#client as RedisClientType).set(
          key,
          value,
          options?.ex ? { EX: options.ex } : undefined
        );
        break;
      case "deno-redis":
        await (this.#client as DenoRedis).set(key, value, options);
        break;
    }
  }

  public async get(key: string): Promise<string | null> {
    if (!this.#client) throw new Error("Redis client not initialized.");

    switch (this.#redisType) {
      case "ioredis":
        return (await (this.#client as IORedis).get(key)) || null;
      case "upstash":
        return (await (this.#client as UpstashRedis).get(key)) || null;
      case "node-redis":
        return (await (this.#client as RedisClientType).get(key)) || null;
      case "deno-redis":
        return (await (this.#client as DenoRedis).get(key)) || null;
    }
  }

  public async del(key: string): Promise<number> {
    if (!this.#client) throw new Error("Redis client not initialized.");

    switch (this.#redisType) {
      case "ioredis":
        return await (this.#client as IORedis).del(key);
      case "upstash":
        return await (this.#client as UpstashRedis).del(key);
      case "node-redis":
        return await (this.#client as RedisClientType).del(key);
      case "deno-redis":
        return await (this.#client as DenoRedis).del(key);
    }
  }

  public async flushAll(): Promise<void> {
    if (!this.#client) throw new Error("Redis client not initialized.");

    switch (this.#redisType) {
      case "ioredis":
        await (this.#client as IORedis).flushall();
        break;
      case "upstash":
        await (this.#client as UpstashRedis).flushall();
        break;
      case "node-redis":
        await (this.#client as RedisClientType).flushAll(); // Capital 'A'
        break;
      case "deno-redis":
        await (this.#client as DenoRedis).flushall();
        break;
      default:
        throw new Error(`flushAll not supported for: ${this.#redisType}`);
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.#client) throw new Error("Redis client not initialized.");

    switch (this.#redisType) {
      case "ioredis":
        return (await (this.#client as IORedis).exists(key)) > 0;
      case "upstash":
        return (await (this.#client as UpstashRedis).exists(key)) > 0;
      case "node-redis":
        return (await (this.#client as RedisClientType).exists(key)) > 0;
      case "deno-redis":
        return (await (this.#client as DenoRedis).exists(key)) > 0;
    }
  }
}
