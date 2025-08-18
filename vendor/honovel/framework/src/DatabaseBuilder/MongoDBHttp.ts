import {
  MongoClient,
  Database,
  Collection,
  Document,
} from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { MongoConnectionConfig } from "configs/@types/index.d.ts";

export class MongoDBHttp {
  #client?: MongoClient;
  #db?: Database;
  #doneInit = false;

  private readonly config: MongoConnectionConfig;

  constructor(config: MongoConnectionConfig) {
    this.config = config;
    if (this.config.driver === "mongodb") {
      this.#client = new MongoClient();
    }
  }

  public async connect() {
    if (this.#doneInit) return;

    if (this.config.driver === "mongodb") {
      try {
        await this.#client!.connect({
          db: this.config.database,
          tls: this.config?.tls ?? false,
          servers: [
            {
              host: this.config.host ?? "127.0.0.1",
              port: parseInt(this.config.port ?? "27017"),
            },
          ],
          credential: this.config.username
            ? {
                username: this.config.username,
                password: this.config.password,
                db: this.config.options?.database ?? "admin",
                mechanism: "SCRAM-SHA-1",
              }
            : undefined,
        });

        this.#db = this.#client!.database(this.config.database);
        this.#doneInit = true;
      } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        throw error;
      }
    } else if (this.config.driver === "mongodb-http") {
      // no TCP connect, just validate required fields
      if (!this.config.options?.appId || !this.config.options?.apiKey) {
        throw new Error(
          "mongodb-http requires `appId` and `apiKey` in options"
        );
      }
      this.#doneInit = true;
    }
  }

  // @ts-ignore //
  public collection<T extends Document = Document>(
    name: string
  ): Collection<T> {
    if (this.config.driver === "mongodb") {
      if (!this.#db) {
        throw new Error("MongoDB not connected. Call connect() first.");
      }
      return this.#db.collection<T>(name);
    }

    throw new Error(
      "collection() not available for mongodb-http. Use HTTP API wrapper."
    );
  }

  public async close() {
    if (this.config.driver === "mongodb" && this.#doneInit) {
      await this.#client?.close();
      this.#doneInit = false;
    }
  }
}
