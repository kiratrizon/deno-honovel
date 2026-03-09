import AbstractStore from "./AbstractStore.ts";
import { Carbon } from "helpers";
import { DB, Schema } from "../../Support/Facades/index.ts";
import { Migration } from "../../Database/Migrations/index.ts";

export default class DatabaseStore extends AbstractStore {
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
        `DatabaseStore requires a valid connection in the database config: ${this.connection}`,
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
            this.connection,
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
