import AbstractStore from "./AbstractStore.ts";
import { RedisClient } from "configs/@types/index.d.ts";
import { RedisManager } from "../../Redis/index.ts";

export default class RedisStore extends AbstractStore {
  private redisClient: RedisClient | null = null;
  private readonly connection?: string;
  // @ts-ignore //
  private manager: RedisManager;
  constructor(
    opts: { connection?: string; prefix: string } = {
      connection: "default",
      prefix: "",
    },
  ) {
    super(opts.prefix);
    this.connection = opts.connection;
    this.prefix = opts.prefix || "";
  }

  #initialized = false;
  private async init() {
    if (this.#initialized || this.manager) return;

    const dbConf = config("database");
    const redisConfig = dbConf?.redis;
    if (!isset(redisConfig)) {
      throw new Error("Redis configuration is not set in the database config.");
    }
    const connections = redisConfig?.connections;
    if (!isset(connections)) {
      throw new Error(
        "Redis connections are not defined in the database config.",
      );
    }
    const driver = connections[this.connection || redisConfig.default]?.driver;
    this.redisClient = driver as RedisClient;
    this.manager = new RedisManager(this.redisClient);
    await this.manager.init(this.connection);
    // Initialize Redis client here if needed
    this.#initialized = true;
  }
  async get(key: string): Promise<any> {
    await this.init();
    const newKey = this.validateKey(key);
    return await this.manager.get(newKey);
  }

  async put(key: string, value: any, seconds: number): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    await this.manager.set(newKey, value, {
      ex: seconds > 0 ? seconds : undefined,
    });
  }

  async forget(key: string): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    await this.manager.del(newKey);
  }

  async flush(): Promise<void> {
    await this.init();
    await this.manager.flushAll();
  }

  getPrefix(): string {
    return this.prefix;
  }
}
