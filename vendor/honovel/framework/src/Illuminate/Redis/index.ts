import { RedisConfigure } from "configs/@types/index.d.ts";

async function connectToRedis(config: RedisConfigure["deno-redis"]) {
  try {
    const { connect } = await import("deno-redis");
    return await connect({
      hostname: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      username: config.username,
      tls: config.tls,
      ...config.options,
    });
  } catch (e) {
    console.error(
      `Please install "deno-redis" to use the deno-redis client: deno task smelt install:driver --redis deno-redis`,
    );
    // @ts-ignore //
    throw new Error(e.message);
  }
}

async function connectToNodeRedis(config: RedisConfigure["node-redis"]) {
  try {
    const { createClient } = await import("redis");
    const client = createClient({
      url: config.nodeRedisUrl,
    });
    await client.connect();
    return client;
  } catch (e) {
    console.error(
      `Please install "redis" to use the node-redis client: deno task smelt install:driver --redis node-redis`,
    );
    // @ts-ignore //
    throw new Error(e.message);
  }
}

async function connectToUpstash(config: RedisConfigure["upstash"]) {
  try {
    const { Redis } = await import("@upstash/redis");
    // validate config
    if (!config.upstashUrl || !config.upstashToken) {
      throw new Error(
        "Upstash Redis configuration requires both upstashUrl and upstashToken.",
      );
    }
    return new Redis({
      url: config.upstashUrl,
      token: config.upstashToken,
    });
  } catch (e) {
    console.error(
      `Please install "upstash" to use the upstash client: deno task smelt install:driver --redis upstash`,
    );
    // @ts-ignore //
    throw new Error(e.message);
  }
}

async function connectToIORedis(config: RedisConfigure["ioredis"]) {
  try {
    const { Redis } = await import("ioredis");
    return new Redis(config.ioredisUrl);
  } catch (e) {
    console.error(
      `Please install "ioredis" to use the ioredis client: deno task smelt install:driver --redis ioredis`,
    );
    // @ts-ignore //
    throw new Error(e.message);
  }
}

export class RedisManager {
  #client: any;
  #redisType: "ioredis" | "upstash" | "node-redis" | "deno-redis";

  constructor(
    redisType: "ioredis" | "upstash" | "node-redis" | "deno-redis" = "ioredis",
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
        this.#client = await connectToIORedis(
          conf as RedisConfigure["ioredis"],
        );
        break;
      case "upstash": {
        this.#client = await connectToUpstash(
          conf as RedisConfigure["upstash"],
        );
        break;
      }
      case "node-redis": {
        const client = await connectToNodeRedis(
          conf as RedisConfigure["node-redis"],
        );
        this.#client = client;
        break;
      }
      case "deno-redis":
        this.#client = await connectToRedis(
          conf as RedisConfigure["deno-redis"],
        );
        break;
      default:
        throw new Error(`Unsupported Redis driver: ${this.#redisType}`);
    }
  }

  public async set(key: string, value: string, options?: { ex?: number }) {
    if (!this.#client) throw new Error("Redis client not initialized.");

    switch (this.#redisType) {
      case "ioredis":
        if (options?.ex) {
          await (this.#client as any).set(key, value, "EX", options.ex);
        } else {
          await (this.#client as any).set(key, value);
        }
        break;
      case "upstash":
        await (this.#client as any).set(
          key,
          value,
          options?.ex ? { ex: options.ex } : undefined,
        );
        break;
      case "node-redis":
        await (this.#client as any).set(
          key,
          value,
          options?.ex ? { EX: options.ex } : undefined,
        );
        break;
      case "deno-redis":
        await (this.#client as any).set(key, value, options);
        break;
    }
  }

  public async get(key: string): Promise<string | null> {
    if (!this.#client) throw new Error("Redis client not initialized.");

    switch (this.#redisType) {
      case "ioredis":
        return (await (this.#client as any).get(key)) || null;
      case "upstash":
        return (await (this.#client as any).get(key)) || null;
      case "node-redis":
        return (await (this.#client as any).get(key)) || null;
      case "deno-redis":
        return (await (this.#client as any).get(key)) || null;
    }
  }

  public async del(key: string): Promise<number> {
    if (!this.#client) throw new Error("Redis client not initialized.");

    switch (this.#redisType) {
      case "ioredis":
        return await (this.#client as any).del(key);
      case "upstash":
        return await (this.#client as any).del(key);
      case "node-redis":
        return await (this.#client as any).del(key);
      case "deno-redis":
        return await (this.#client as any).del(key);
    }
  }

  public async flushAll(): Promise<void> {
    if (!this.#client) throw new Error("Redis client not initialized.");

    switch (this.#redisType) {
      case "ioredis":
        await (this.#client as any).flushall();
        break;
      case "upstash":
        await (this.#client as any).flushall();
        break;
      case "node-redis":
        await (this.#client as any).flushAll(); // Capital 'A'
        break;
      case "deno-redis":
        await (this.#client as any).flushall();
        break;
      default:
        throw new Error(`flushAll not supported for: ${this.#redisType}`);
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.#client) throw new Error("Redis client not initialized.");

    switch (this.#redisType) {
      case "ioredis":
        return (await (this.#client as any).exists(key)) > 0;
      case "upstash":
        return (await (this.#client as any).exists(key)) > 0;
      case "node-redis":
        return (await (this.#client as any).exists(key)) > 0;
      case "deno-redis":
        return (await (this.#client as any).exists(key)) > 0;
    }
  }
}
