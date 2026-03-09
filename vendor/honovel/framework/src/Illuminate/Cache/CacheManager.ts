import { CacheDriver, SupportedDrivers } from "configs/@types/index.d.ts";
import AbstractStore from "./Stores/AbstractStore.ts";
import ObjectStore from "./Stores/ObjectStore.ts";
import FileStore from "./Stores/FileStore.ts";
import RedisStore from "./Stores/RedisStore.ts";
import DatabaseStore from "./Stores/DatabaseStore.ts";
import MemoryStore from "./Stores/MemoryStore.ts";
import MemcachedStore from "./Stores/MemcachedStore.ts";
import DynamoDBStore from "./Stores/DynamoDBStore.ts";
import MongoDBStore from "./Stores/MongoDBStore.ts";

export default class CacheManager {
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
    } = {},
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
            "Each server in MemcachedStore must have host, port, and weight.",
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
            "Custom cache driver requires a class extending AbstractStore.",
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
