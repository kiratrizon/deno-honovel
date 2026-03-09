import AbstractStore from "./AbstractStore.ts";
import { Carbon } from "helpers";
import { MongoConnectionConfig } from "configs/@types/index.d.ts";
import MongoDB from "../../../DatabaseBuilder/MongoDB.ts";

export default class MongoDBStore extends AbstractStore {
  private db: MongoDB;
  private readonly collection: string;
  private readonly connection: string;
  // @ts-ignore //
  private Collection: any;
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
        `MongoDBStore requires a valid connection in the database config: ${this.connection}`,
      );
    }
    const driver = dbConf.connections[this.connection].driver;
    if (driver !== "mongodb") {
      throw new Error(
        `MongoDBStore requires a valid MongoDB connection, got: ${driver}`,
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
      const result = await this.Collection.findOne({
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
      console.error(`Error getting key "${newKey}":`, error);
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
        { upsert: true },
      );
    } catch (error) {
      console.error(`Error setting key "${newKey}":`, error);
    }
  }

  public async forget(key: string): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      await this.Collection.deleteOne({ key: newKey });
    } catch (error) {
      console.error(`Error deleting key "${newKey}":`, error);
    }
  }

  public async flush(): Promise<void> {
    await this.init();
    try {
      await this.Collection.deleteMany({});
    } catch (error) {
      console.error("Error flushing MongoDB store:", error);
    }
  }

  getPrefix(): string {
    return this.prefix;
  }
}
