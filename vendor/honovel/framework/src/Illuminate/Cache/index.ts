// file
// redis
// object
// database
// memory
// memcached
// dynamodb
// mongodb
// null

import { Carbon } from "helpers";
import {
  CacheDriver,
  MongoConnectionConfig,
  RedisClient,
  SupportedDrivers,
} from "configs/@types/index.d.ts";
import { RedisManager } from "../Redis/index.ts";
import { DB, Schema } from "../Support/Facades/index.ts";
import { Migration } from "../Database/Migrations/index.ts";
import * as path from "node:path";
import {
  Memcached as MemcachedClient,
  InMemoryCached,
} from "@avroit/memcached";

type MaintenanceData = {
  message: string;
  retry: number;
  allow: string[];
  secret: string;
  render: string;
  redirect: string;
  timestamp: number;
};

export interface CacheStoreData {
  maintenance: MaintenanceData;
}

export abstract class AbstractStore<T extends CacheStoreData = CacheStoreData> {
  protected prefix: string = "";
  /**
   * @param prefix The prefix to use for cache keys.
   */
  constructor(prefix?: string) {
    this.prefix = prefix || config("cache").prefix || "";
  }
  /**
   * @param key The key to retrieve from the cache.
   * @returns The value associated with the key, or null if not found.
   */
  abstract get<K extends keyof T>(key: K): Promise<T[K]>;
  abstract get(key: string): Promise<any>;

  /**
   * Store an item in the cache for a given number of seconds.
   * @param key The key to store the value under.
   * @param value The value to store.
   * @param seconds The number of seconds until the item should expire.
   */
  abstract put<K extends keyof T>(
    key: K,
    value: T[K],
    seconds: number
  ): Promise<void>;
  abstract put(key: string, value: any, seconds: number): Promise<void>;

  /**
   * Remove an item from the cache.
   * @param key The key to remove from the cache.
   */
  abstract forget<K extends keyof T>(key: K): Promise<void>;
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
  async forever<K extends keyof T>(key: K, value: T[K] | any): Promise<void> {
    // Convention: use 0 or -1 to mean "forever"
    await this.put(key, value, 0);
  }

  /**
   * Increment the value of an item in the cache.
   */
  async increment<K extends keyof T>(
    key: K,
    value?: number
  ): Promise<number | null>;

  async increment(key: string, value?: number): Promise<number | null>;

  // Implementation
  async increment(
    key: keyof T | string,
    value: number = 1
  ): Promise<number | null> {
    const current = await this.get(key as any);
    if (typeof current === "number") {
      const newVal = current + value;
      await this.put(key as any, newVal, 0);
      return newVal;
    }
    return null;
  }

  /**
   * Decrement the value of an item in the cache.
   */
  async decrement<K extends keyof T>(
    key: K,
    value?: number
  ): Promise<number | null>;
  async decrement(key: string, value?: number): Promise<number | null>;
  async decrement(
    key: keyof T | string,
    value: number = 1
  ): Promise<number | null> {
    const current = await this.get(key as any);
    if (typeof current === "number") {
      const newVal = current - value;
      await this.put(key as any, newVal, 0);
      return newVal;
    }
    return null;
  }

  /**
   * Get a value or return default.
   */
  async getOrDefault<K extends keyof T>(
    key: K,
    defaultValue: T[K]
  ): Promise<T[K]>;
  async getOrDefault(key: string, defaultValue: any): Promise<any>;
  async getOrDefault(key: keyof T | string, defaultValue: any): Promise<any> {
    const value = await this.get(key as any);
    return value !== null && value !== undefined ? value : defaultValue;
  }

  /**
   * Check if a key exists in cache.
   */
  async has<K extends keyof T>(key: K): Promise<boolean>;
  async has(key: string): Promise<boolean>;
  async has(key: keyof T | string): Promise<boolean> {
    const value = await this.get(key as any);
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

  protected warning(storeType: string, err: boolean = false) {
    if (config("app").env !== "local") {
      if (!err) {
        consoledeno.warn(
          `${storeType} cache store is not recommended for production environments.`
        );
      } else {
        throw new Error(
          `${storeType} cache store is not allowed for production environments.`
        );
      }
    }
  }
}

class FileStore extends AbstractStore {
  private path: string;
  constructor(
    opts: { prefix: string; path?: string } = {
      prefix: "",
    }
  ) {
    super(opts.prefix);
    this.warning("File driver", true);
    this.prefix = this.validateFilePath(opts.prefix);
    if (!isset(opts.path) || empty(opts.path) || !isString(opts.path)) {
      throw new Error("FileStore requires a valid path.");
    }
    this.path = opts.path;
  }

  private validateFilePath(filePath: string): string {
    if (Deno.build.os === "windows") {
      return filePath.replace(/[:*?"<>|]/g, "_");
    }
    return filePath;
  }

  async get(key: string): Promise<any> {
    // Implement logic to retrieve value from file cache
    const newKey = this.validateFilePath(this.validateKey(key));
    await this.init();
    // For example, read from a JSON file or similar
    const filePath = path.join(
      path.normalize(this.path),
      path.normalize(`${newKey}.cache.json`)
    );
    if (!(await pathExist(filePath))) {
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
    const newKey = this.validateFilePath(this.validateKey(key));
    await this.init();
    // Logic to write value to a file, possibly with expiration logic
    const expiresAt =
      seconds > 0 ? strToTime(Carbon.now().addSeconds(seconds)) : null;
    const cacheItem = {
      value: value,
      expiresAt: expiresAt,
    };

    const filePath = path.join(
      path.normalize(this.path),
      path.normalize(`${newKey}.cache.json`)
    );
    writeFile(filePath, jsonEncode(cacheItem));
  }

  async forget(key: string): Promise<void> {
    // Implement logic to remove key from file cache
    const newKey = this.validateFilePath(this.validateKey(key));
    await this.init();
    const filePath = path.join(
      path.normalize(this.path),
      path.normalize(`${newKey}.cache.json`)
    );
    if (await pathExist(filePath)) {
      Deno.removeSync(filePath);
    }
  }

  async flush(): Promise<void> {
    // Implement logic to clear all items in the file cache
    await this.init();
    const files = Deno.readDirSync(this.path);
    for (const file of files) {
      if (
        file.isFile &&
        file.name.endsWith(".cache.json") &&
        file.name.startsWith(this.prefix)
      ) {
        Deno.removeSync(
          path.join(path.normalize(this.path), path.normalize(file.name))
        );
      }
    }
  }

  #initialized = false;
  private async init() {
    if (this.#initialized) return;
    if (!(await pathExist(this.path))) {
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
  // @ts-ignore //
  private manager: RedisManager;
  constructor(
    opts: { connection?: string; prefix: string } = {
      connection: "default",
      prefix: "",
    }
  ) {
    super(opts.prefix);
    const dbConf = config("database");
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

class ObjectStore extends AbstractStore {
  private store: Record<string, { value: any; expiresAt: number | null }> = {};

  constructor(opts: { prefix?: string } = { prefix: "" }) {
    super(opts.prefix);
    this.warning("Object driver");
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
  private readonly table: string;
  private readonly connection: string;
  constructor({
    table,
    connection,
    prefix,
  }: {
    prefix: string;
    table: string;
    connection: string;
  }) {
    super(prefix);
    if (!isset(table) || !isString(table)) {
      throw new Error("DatabaseStore requires a valid table name.");
    }
    this.table = table;
    this.connection = connection || (config("database").default as string);
    const dbConf = config("database");
    if (!keyExist(dbConf.connections, this.connection)) {
      throw new Error(
        `DatabaseStore requires a valid connection in the database config: ${this.connection}`
      );
    }
  }

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
    await DB.connection(this.connection)
      .table(this.table)
      .where("key", newKey)
      .delete();
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
  private store = new InMemoryCached();
  constructor(opts: { prefix?: string } = { prefix: "" }) {
    super(opts.prefix);
    this.warning("Memory driver");
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
    super(opts.prefix);
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
      consoledeno.error(`Error getting key "${newKey}":`, error);
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
      consoledeno.error(`Error setting key "${newKey}":`, error);
    }
  }

  public async forget(key: string): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      await this.client.delete(newKey);
    } catch (error) {
      consoledeno.error(`Error deleting key "${newKey}":`, error);
    }
  }

  public async flush(): Promise<void> {
    await this.init();
    try {
      await this.client.flush();
    } catch (error) {
      consoledeno.error("Error flushing Memcached store:", error);
    }
  }

  getPrefix(): string {
    return this.prefix;
  }
}

import {
  DynamoDBClient,
  PutItemCommand,
  CreateTableCommand,
  DescribeTableCommand,
  GetItemCommand,
  DeleteItemCommand,
  ScanCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";

class DynamoDBStore extends AbstractStore {
  private client: DynamoDBClient;
  private readonly table: string;
  private readonly partitionKey: string;
  constructor(
    driver: CacheDriver,
    opts: {
      key?: string;
      secret?: string;
      region?: string;
      table?: string;
      prefix?: string;
      partitionKey?: string;
    } = {}
  ) {
    super(opts.prefix);
    const { key, secret, region, table, prefix, partitionKey } = opts;
    if (!isset(key) || !isset(secret) || !isset(region)) {
      throw new Error("DynamoDBStore requires valid key, secret, and region.");
    }
    if (!isset(table) || !isString(table)) {
      throw new Error("DynamoDBStore requires a valid table name.");
    }
    this.client = new DynamoDBClient({
      region: region,
      credentials: {
        accessKeyId: key,
        secretAccessKey: secret,
      },
    });
    if (driver !== "dynamodb") {
      throw new Error(`Unsupported cache driver for DynamoDB: ${driver}`);
    }
    if (!isset(partitionKey) || !isString(partitionKey)) {
      throw new Error("DynamoDBStore requires a valid partition key.");
    }
    this.partitionKey = partitionKey;
    this.prefix = prefix || config("cache").prefix || "";
    this.table = table;
  }

  #initialized = false;
  public async init() {
    if (this.#initialized) return; // Already initialized
    try {
      await this.client.send(
        new DescribeTableCommand({ TableName: this.table })
      );
      this.#initialized = true; // Mark as initialized
      return;
    } catch (error) {
      if ((error as Error).name !== "ResourceNotFoundException") {
        throw error; // Re-throw if it's not a "table doesn't exist" error
      }
    }
    const command = new CreateTableCommand({
      TableName: this.table,
      KeySchema: [
        {
          AttributeName: this.partitionKey,
          KeyType: "HASH", // Partition key
        },
      ],
      BillingMode: "PAY_PER_REQUEST", // On-demand billing
      AttributeDefinitions: [
        {
          AttributeName: this.partitionKey,
          AttributeType: "S", // String type
        },
      ],
    });

    try {
      await this.client.send(command);
      this.#initialized = true; // Mark as initialized
    } catch (error) {
      consoledeno.error(`Error creating table "${this.table}":`, error);
      throw error; // Re-throw the error if table creation fails
    }
  }

  public async get(key: string): Promise<any> {
    await this.init();
    const newKey = this.validateKey(key);

    try {
      const result = await this.client.send(
        new GetItemCommand({
          TableName: this.table,
          Key: {
            [this.partitionKey]: { S: newKey },
          },
        })
      );

      if (!result.Item || !result.Item.name || !result.Item.name.S) return null;
      const data = jsonDecode(result.Item.name.S || "{}");
      if (keyExist(data, "expiresAt")) {
        const expiresAt = data.expiresAt as string | null;
        if (isNull(expiresAt)) {
          return data.value; // No expiration, return value
        } else {
          if (!isString(expiresAt)) {
            return null; // Invalid expiration format
          } else {
            const expiresAtTime = strToTime(expiresAt);
            if (expiresAtTime && time() > expiresAtTime) {
              // Item has expired
              await this.forget(newKey); // Optionally remove expired item
              return null;
            }
            return data.value; // Return the cached value
          }
        }
      }
      return null;
    } catch (error) {
      consoledeno.error(`Error getting key "${newKey}":`, error);
      return null;
    }
  }

  public async put(key: string, value: any, seconds: number): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    const expiresAt =
      seconds > 0 ? strToTime(Carbon.now().addSeconds(seconds)) : null;

    const data = {
      value: value,
      expiresAt,
    };

    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.table,
          Item: {
            [this.partitionKey]: { S: newKey },
            name: { S: jsonEncode(data) },
          },
        })
      );
    } catch (error) {
      consoledeno.error(`Error setting key "${newKey}":`, error);
    }
  }

  public async forget(key: string): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      await this.client.send(
        new DeleteItemCommand({
          TableName: this.table,
          Key: {
            [this.partitionKey]: { S: newKey },
          },
        })
      );
    } catch (error) {
      consoledeno.error(`Error deleting key "${newKey}":`, error);
    }
  }

  // control flush all items in the cache
  public async flush(): Promise<void> {
    await this.init();
    try {
      const scanCommand = new ScanCommand({
        TableName: this.table,
      });
      const items = await this.client.send(scanCommand);

      if (items.Items && items.Items.length > 0) {
        const keysToDelete = items.Items.map((item) => ({
          [this.partitionKey]: item[this.partitionKey],
        }));

        // Batch in chunks of 25
        for (let i = 0; i < keysToDelete.length; i += 25) {
          const chunk = keysToDelete.slice(i, i + 25);

          const batchWriteCommand = new BatchWriteItemCommand({
            RequestItems: {
              [this.table]: chunk.map((key) => ({
                DeleteRequest: { Key: key },
              })),
            },
          });

          await this.client.send(batchWriteCommand);
        }
      }
    } catch (error) {
      consoledeno.error("Error flushing DynamoDB store:", error);
    }
  }
  getPrefix(): string {
    return this.prefix;
  }
}

import MongoDB from "../../DatabaseBuilder/MongoDB.ts";
import { Collection, Document } from "mongodb";

class MongoDBStore extends AbstractStore {
  private db: MongoDB;
  private readonly collection: string;
  private readonly connection: string;
  // @ts-ignore //
  private Collection: Collection;
  constructor({
    collection = "",
    prefix = "",
    connection = "",
  }: {
    collection: string;
    prefix?: string;
    connection?: string;
  }) {
    super(prefix);
    if (!isset(collection) || !isString(collection) || empty(collection)) {
      throw new Error("MongoDBStore requires a valid collection name.");
    }
    this.collection = collection;
    if (!isset(connection) || !isString(connection) || empty(connection)) {
      throw new Error("MongoDBStore requires a valid connection name.");
    }
    this.connection = connection;
    const dbConf = config("database");
    if (!keyExist(dbConf.connections, this.connection)) {
      throw new Error(
        `MongoDBStore requires a valid connection in the database config: ${this.connection}`
      );
    }
    const driver = dbConf.connections[this.connection].driver;
    if (driver !== "mongodb") {
      throw new Error(
        `MongoDBStore requires a valid MongoDB connection, got: ${driver}`
      );
    }
    const connectionObj = dbConf.connections[
      this.connection
    ] as MongoConnectionConfig;
    this.db = new MongoDB(connectionObj);
  }

  private async init() {
    await this.db.connect();
    this.Collection = this.db.collection(this.collection);
  }

  async get(key: string): Promise<any> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      const result = await (this.Collection as Collection<Document>).findOne({
        key: newKey,
      });
      if (!result) return null; // Key does not exist
      if (keyExist(result, "expiresAt")) {
        const expiresAt = result.expiresAt as string | null;
        if (isNull(expiresAt)) {
          return result.value; // No expiration, return value
        } else {
          if (isInteger(expiresAt)) {
            if (time() > expiresAt) {
              // Item has expired
              await this.forget(newKey); // Optionally remove expired item
              return null;
            } else {
              return result.value; // Return the cached value
            }
          }
        }
      }
      return null;
    } catch (error) {
      consoledeno.error(`Error getting key "${newKey}":`, error);
      return null;
    }
  }

  async put(key: string, value: any, seconds: number): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    const expiresAt =
      seconds > 0 ? strToTime(Carbon.now().addSeconds(seconds)) : null;

    const data = {
      value: value,
      expiresAt: expiresAt,
    };

    try {
      await this.Collection.updateOne(
        { key: newKey },
        { $set: data },
        { upsert: true }
      );
    } catch (error) {
      consoledeno.error(`Error setting key "${newKey}":`, error);
    }
  }

  public async forget(key: string): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      await this.Collection.deleteOne({ key: newKey });
    } catch (error) {
      consoledeno.error(`Error deleting key "${newKey}":`, error);
    }
  }

  public async flush(): Promise<void> {
    await this.init();
    try {
      await this.Collection.deleteMany({});
    } catch (error) {
      consoledeno.error("Error flushing MongoDB store:", error);
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
      // for dynamodb driver
      key?: string;
      secret?: string;
      region?: string;
      partitionKey?: string;
      collection?: string;
      class?: typeof AbstractStore;
    } = {}
  ) {
    const {
      path,
      connection,
      prefix,
      table,
      servers,
      key,
      secret,
      region,
      partitionKey,
      collection,
    } = options;
    this.prefix = prefix || config("cache").prefix || "";
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
      case "dynamodb": {
        this.store = new DynamoDBStore(driver, {
          key,
          secret,
          region,
          table,
          partitionKey,
        });
        break;
      }
      case "mongodb": {
        this.store = new MongoDBStore({
          collection: collection || "cache",
          prefix: this.prefix,
          connection,
        });
        break;
      }
      case "custom": {
        if (!isset(options.class)) {
          throw new Error(
            "Custom cache driver requires a class extending AbstractStore."
          );
        }
        // @ts-ignore //
        this.store = new options.class();
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
