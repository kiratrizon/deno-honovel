// file
// redis
// object
// database
// memory
// memcached
// dynamodb
// null

import { Carbon } from "honovel:helpers";
import {
  CacheDriver,
  RedisClient,
  SupportedDrivers,
} from "configs/@types/index.d.ts";
import { RedisManager } from "../Redis/index.ts";
import { DB, Schema } from "../Support/Facades/index.ts";
import { Migration } from "../Database/Migrations/index.ts";

import {
  Memcached as MemcachedClient,
  InMemoryCached,
} from "@avroit/memcached";

export abstract class AbstractStore {
  /**
   * @param key The key to retrieve from the cache.
   * * @returns The value associated with the key, or null if not found.
   */
  // deno-lint-ignore no-explicit-any
  abstract get(key: string): Promise<any>;

  /**
   * Store an item in the cache for a given number of seconds.
   * @param key The key to store the value under.
   * @param value The value to store.
   * @param seconds The number of seconds until the item should expire.
   */
  // deno-lint-ignore no-explicit-any
  abstract put(key: string, value: any, seconds: number): Promise<void>;

  /**
   * Remove an item from the cache.
   * @param key The key to remove from the cache.
   */
  abstract forget(key: string): Promise<void>;

  /**
   * Remove all items from the cache.
   */
  abstract flush(): Promise<void>;

  /**
   * Get the prefix used for cache keys.
   * This is typically used to avoid key collisions between different applications or environments.
   */
  abstract getPrefix(): string;

  /**
   * Store an item in the cache indefinitely.
   */
  // deno-lint-ignore no-explicit-any
  async forever(key: string, value: any): Promise<void> {
    // Convention: use 0 or -1 to mean "forever"
    await this.put(key, value, 0);
  }

  /**
   * Increment the value of an item in the cache.
   */
  async increment(key: string, value: number = 1): Promise<number | null> {
    const current = await this.get(key);
    if (typeof current === "number") {
      const newVal = current + value;
      await this.put(key, newVal, 0);
      return newVal;
    }
    return null;
  }

  /**
   * Decrement the value of an item in the cache.
   */
  async decrement(key: string, value: number = 1): Promise<number | null> {
    const current = await this.get(key);
    if (typeof current === "number") {
      const newVal = current - value;
      await this.put(key, newVal, 0);
      return newVal;
    }
    return null;
  }

  /**
   * Get a value or return default.
   */
  // deno-lint-ignore no-explicit-any
  async getOrDefault<T = any>(key: string, defaultValue: T): Promise<T> {
    const value = await this.get(key);
    return value !== null && value !== undefined ? value : defaultValue;
  }

  /**
   * Check if a key exists in cache.
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return isset(value);
  }

  protected validateKey(key: string): string {
    if (!isset(key) || empty(key) || !isString(key)) {
      throw new Error(`Key must be a non-empty string`);
    }
    if (key.includes(" ")) {
      throw new Error(`Key cannot contain spaces: "${key}"`);
    }
    if (!key.trim()) {
      throw new Error(`Key cannot be an empty string`);
    }
    const keys = [this.getPrefix(), key];
    const newKey = keys.filter((k) => isset(k) && !empty(k)).join("_");
    return newKey;
  }
}

class FileStore extends AbstractStore {
  private readonly prefix: string;
  private path: string;
  constructor(
    opts: { prefix: string; path?: string } = {
      prefix: "",
    }
  ) {
    super();
    this.prefix = opts.prefix;
    if (!isset(opts.path) || empty(opts.path) || !isString(opts.path)) {
      throw new Error("FileStore requires a valid path.");
    }
    this.path = opts.path;
  }

  async get(key: string): Promise<any> {
    // Implement logic to retrieve value from file cache
    const newKey = this.validateKey(key);
    await this.init();
    // For example, read from a JSON file or similar
    const filePath = `${this.path}/${newKey}.cache.json`;
    if (!pathExist(filePath)) {
      return null; // Key does not exist
    }

    const fileContent = getFileContents(filePath);
    if (!fileContent) {
      return null; // File is empty or does not exist
    }
    const cacheItem = jsonDecode(fileContent);
    if (cacheItem.expiresAt && time() > cacheItem.expiresAt) {
      // Item has expired
      Deno.removeSync(filePath); // Optionally remove expired item
      return null;
    }
    return cacheItem.value; // Return the cached value
  }

  async put(key: string, value: any, seconds: number): Promise<void> {
    // Implement logic to store value in file cache
    const newKey = this.validateKey(key);
    await this.init();
    // Logic to write value to a file, possibly with expiration logic
    const expiresAt =
      seconds > 0 ? strToTime(Carbon.now().addSeconds(seconds)) : null;
    const cacheItem = {
      value: value,
      expiresAt: expiresAt,
    };

    const filePath = `${this.path}/${newKey}.cache.json`;
    writeFile(filePath, jsonEncode(cacheItem));
  }

  async forget(key: string): Promise<void> {
    // Implement logic to remove key from file cache
    const newKey = this.validateKey(key);
    await this.init();
    const filePath = `${this.path}/${newKey}.cache.json`;
    if (pathExist(filePath)) {
      Deno.removeSync(filePath);
    }
  }

  async flush(): Promise<void> {
    // Implement logic to clear all items in the file cache
    await this.init();
    const files = Deno.readDirSync(this.path);
    for (const file of files) {
      if (file.isFile && file.name.endsWith(".cache.json")) {
        Deno.removeSync(`${this.path}/${file.name}`);
      }
    }
  }

  #initialized = false;
  private async init() {
    if (this.#initialized) return;
    if (!pathExist(this.path)) {
      makeDir(this.path);
    }
    this.#initialized = true;
  }

  getPrefix(): string {
    return this.prefix;
  }
}

class RedisStore extends AbstractStore {
  private static redisClient: RedisClient;
  private readonly connection?: string;
  private readonly prefix: string;
  // @ts-ignore //
  private manager: RedisManager;
  constructor(
    opts: { connection?: string; prefix: string } = {
      connection: "default",
      prefix: "",
    }
  ) {
    super();
    const dbConf = staticConfig("database");
    if (!RedisStore.redisClient) {
      RedisStore.redisClient = dbConf.redis?.client || "upstash";
    }
    if (!isset(dbConf.redis?.connections)) {
      throw new Error("Redis connections are not configured.");
    }
    this.connection = opts.connection;
    this.prefix = opts.prefix || "";
  }

  #initialized = false;
  private async init() {
    if (this.#initialized || this.manager) return;
    this.manager = new RedisManager(RedisStore.redisClient);
    await this.manager.init(this.connection);
    // Initialize Redis client here if needed
    this.#initialized = true;
  }
  // deno-lint-ignore no-explicit-any
  async get(key: string): Promise<any> {
    await this.init();
    const newKey = this.validateKey(key);
    return await this.manager.get(newKey);
  }

  // deno-lint-ignore no-explicit-any
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

class ObjectStore extends AbstractStore {
  private store: Record<string, { value: any; expiresAt: number | null }> = {};
  private readonly prefix: string;

  constructor(opts: { prefix?: string } = { prefix: "" }) {
    super();
    this.prefix = opts.prefix || "";
  }

  async get(key: string): Promise<any> {
    const newKey = this.validateKey(key);
    const cacheItem = this.store[newKey];

    if (!cacheItem) return null;

    if (cacheItem.expiresAt && time() > cacheItem.expiresAt) {
      delete this.store[newKey];
      return null;
    }

    return cacheItem.value;
  }

  async put(key: string, value: any, seconds: number): Promise<void> {
    const newKey = this.validateKey(key);

    const expiresAt =
      seconds > 0 ? strToTime(Carbon.now().addSeconds(seconds)) : null;

    this.store[newKey] = {
      value,
      expiresAt,
    };
  }

  async forget(key: string): Promise<void> {
    const newKey = this.validateKey(key);
    delete this.store[newKey];
  }

  async flush(): Promise<void> {
    this.store = {};
  }

  getPrefix(): string {
    return this.prefix;
  }
}

class DatabaseStore extends AbstractStore {
  private readonly prefix: string;
  private readonly table: string;
  private readonly connection: SupportedDrivers;
  constructor({
    prefix,
    table,
    connection,
  }: {
    prefix: string;
    table: string;
    connection: SupportedDrivers;
  }) {
    super();
    this.prefix = prefix || staticConfig("cache").prefix || "";
    if (!isset(table) || !isString(table)) {
      throw new Error("DatabaseStore requires a valid table name.");
    }
    this.table = table;
    this.connection = connection || staticConfig("database").default;
    const dbConf = staticConfig("database");
    if (!keyExist(dbConf.connections, this.connection)) {
      throw new Error(
        `DatabaseStore requires a valid connection in the database config: ${this.connection}`
      );
    }
  }

  // deno-lint-ignore no-explicit-any
  async get(key: string): Promise<any> {
    // Implement logic to retrieve value from database cache
    const newKey = this.validateKey(key);
    await this.init();
    const sub = DB.connection(this.connection)
      .table(this.table)
      .select("value", "expires_at")
      .where("key", newKey);
    const result = await sub.first();
    if (!result) return null; // Key does not exist
    if (isNull(result.expires_at)) {
      return jsonDecode(result.value as string); // No expiration, return value
    } else {
      const expiresAt = strToTime(result.expires_at as string);
      if (expiresAt && time() > expiresAt) {
        // Item has expired
        await this.forget(newKey); // Optionally remove expired item
        return null;
      }
      return jsonDecode(result.value as string); // Return the cached value
    }
  }

  // deno-lint-ignore no-explicit-any
  async put(key: string, value: any, seconds: number): Promise<void> {
    // Implement logic to store value in database cache
    const newKey = this.validateKey(key);
    await this.init();
    const expiresAt = seconds > 0 ? Carbon.now().addSeconds(seconds) : null;
    const cacheItem = {
      key: newKey,
      value: jsonEncode(value),
      expires_at: expiresAt,
    };
    await DB.connection(this.connection).insertOrUpdate(this.table, cacheItem, [
      "key",
    ]);
  }

  async forget(key: string): Promise<void> {
    // Implement logic to remove key from database cache
    const newKey = this.validateKey(key);
    await this.init();
    const sql = `DELETE FROM ${this.table} WHERE key = ?`;
    const values = [newKey];
    await DB.connection(this.connection).statement(sql, values);
  }

  async flush(): Promise<void> {
    // Implement logic to clear all items in the database cache
    await this.init();
    const sql = `DELETE FROM ${this.table}`;
    const values: any[] = [];
    await DB.connection(this.connection).statement(sql, values);
  }

  #initialized = false;
  private async init() {
    const table = this.table;

    const migrationClass = new (class extends Migration {
      async up() {
        if (!(await Schema.hasTable(table, this.connection))) {
          await Schema.create(
            table,
            (table) => {
              table.id();
              table.string("key").unique();
              table.text("value");
              table.timestamp("expires_at").nullable();
            },
            this.connection
          );
        }
      }
      async down() {
        if (await Schema.hasTable(table, this.connection)) {
          await Schema.dropIfExists(table, this.connection);
        }
      }
    })();
    if (!this.#initialized) {
      migrationClass.setConnection(this.connection);
      await migrationClass.up();
      this.#initialized = true;
    }
  }

  getPrefix(): string {
    return this.prefix;
  }
}

class MemoryStore extends AbstractStore {
  private readonly prefix: string;
  private store = new InMemoryCached();
  constructor(opts: { prefix?: string } = { prefix: "" }) {
    super();
    this.prefix = opts.prefix || "";
  }
  async get(key: string): Promise<any> {
    const newKey = this.validateKey(key);
    const cacheItem = await this.store.get(newKey);
    if (!isset(cacheItem)) return null; // Key does not exist
    return jsonDecode(cacheItem);
  }
  async put(key: string, value: any, seconds: number): Promise<void> {
    value = jsonEncode(value);
    const newKey = this.validateKey(key);
    const expiresAt =
      seconds > 0
        ? (strToTime(Carbon.now().addSeconds(seconds)) as number)
        : undefined;

    await this.store.set(newKey, value, expiresAt);
  }
  async forget(key: string): Promise<void> {
    const newKey = this.validateKey(key);
    await this.store.delete(newKey);
  }
  async flush(): Promise<void> {
    await this.store.flush();
  }
  getPrefix(): string {
    return this.prefix;
  }
}

class MemcachedStore extends AbstractStore {
  private readonly prefix: string;
  private readonly servers: {
    host: string;
    port: number;
    weight?: number;
    poolSize?: number;
  }[];
  // @ts-ignore //
  private client: MemcachedClient;

  constructor(opts: {
    prefix?: string;
    servers: { host: string; port: number; weight?: number }[];
  }) {
    super();
    this.prefix = opts.prefix || "";
    if (!isset(opts.servers) || !isArray(opts.servers)) {
      throw new Error("MemcachedStore requires a valid servers array.");
    }
    opts.servers.map((server) => {
      // @ts-ignore //
      server.poolSize = server.weight || 5;
      delete server.weight;
      return server;
    });
    this.servers = opts.servers;
  }

  private async init() {
    if (this.client) return; // Already initialized
    console.log("hello");
    this.client = new MemcachedClient(this.servers[0]);
  }

  public async get(key: string): Promise<any> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      const value = await this.client.get(newKey);
      if (value === undefined || value === null) {
        return null; // Key does not exist
      }
      return jsonDecode(value); // Return the cached value
    } catch (error) {
      console.error(`Error getting key "${newKey}":`, error);
      return null; // Handle error gracefully
    }
  }

  public async put(key: string, value: any, seconds: number): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      await this.client.set(
        newKey,
        jsonEncode(value),
        seconds > 0 ? seconds : undefined
      );
    } catch (error) {
      console.error(`Error setting key "${newKey}":`, error);
    }
  }

  public async forget(key: string): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      await this.client.delete(newKey);
    } catch (error) {
      console.error(`Error deleting key "${newKey}":`, error);
    }
  }

  public async flush(): Promise<void> {
    await this.init();
    try {
      await this.client.flush();
    } catch (error) {
      console.error("Error flushing Memcached store:", error);
    }
  }

  getPrefix(): string {
    return this.prefix;
  }
}

class CacheManager {
  private store: AbstractStore;
  private prefix: string;
  constructor(
    driver: CacheDriver,
    options: {
      driver?: CacheDriver;
      // For file driver
      path?: string;
      // Uses connection depends on driver
      connection?: string;
      // per-store override
      prefix?: string;
      // for database driver
      table?: string;
      // for memcached driver
      servers?: { host: string; port: number; weight?: number }[];
    } = {}
  ) {
    const { path, connection, prefix, table, servers } = options;
    this.prefix = prefix || staticConfig("cache").prefix || "";
    switch (driver) {
      case "object": {
        this.store = new ObjectStore({ prefix: this.prefix });
        break;
      }
      case "file": {
        this.store = new FileStore({
          prefix: this.prefix,
          path,
        });
        break;
      }
      case "redis": {
        this.store = new RedisStore({
          connection: connection,
          prefix: this.prefix,
        });
        break;
      }
      case "database": {
        if (!table || !isString(table)) {
          throw new Error("DatabaseStore requires a valid table name.");
        }

        this.store = new DatabaseStore({
          prefix: this.prefix,
          table: table,
          connection: connection as SupportedDrivers,
        });
        break;
      }
      case "memory": {
        this.store = new MemoryStore({ prefix: this.prefix });
        break;
      }
      case "memcached": {
        if (!isArray(servers) || servers.length === 0) {
          throw new Error("MemcachedStore requires a valid servers array.");
        }
        if (
          !servers.every((server) => isset(server.host) && isset(server.port))
        ) {
          throw new Error(
            "Each server in MemcachedStore must have host, port, and weight."
          );
        }
        this.store = new MemcachedStore({
          prefix: this.prefix,
          servers,
        });
        break;
      }
      default: {
        throw new Error(`Unsopported cache driver: ${driver}`);
      }
    }
  }

  getStore(): AbstractStore {
    return this.store;
  }
}

export { CacheManager };
