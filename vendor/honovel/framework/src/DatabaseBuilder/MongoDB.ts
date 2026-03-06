import { MongoConnectionConfig } from "configs/@types/index.d.ts";

class MongoDB {
  private client: any; // MongoClient loaded dynamically
  private readonly database: string;
  private readonly dbAuth?: string;
  private readonly uri: string;
  #doneInit = false;

  constructor(conf: MongoConnectionConfig) {
    this.uri = conf.uri as string;
    this.database = conf.database;
    if (conf.options?.database) {
      this.dbAuth = conf.options.database;
    }
  }

  public async connect() {
    if (!this.#doneInit) {
      try {
        // Dynamically import MongoDB client
        const { MongoClient } = await import("mongodb");
        this.client = new MongoClient(this.uri);

        if (isset(this.dbAuth)) {
          await this.client.db(this.dbAuth).command({ ping: 1 });
        }
        await this.client.connect();
        this.#doneInit = true;
      } catch (error) {
        if ((error as Error).message?.includes("Cannot resolve")) {
          console.error(
            `Please install "mongodb" to use MongoDB: deno task smelt install:driver --database mongodb`,
          );
        } else {
          console.error("Failed to connect to MongoDB:", error);
        }
        throw error;
      }
    }
  }

  public collection<T = any>(name: string): any {
    if (!this.client) {
      throw new Error("MongoDB client not initialized. Call connect() first.");
    }
    // @ts-ignore //
    return this.client.db(this.database).collection<T>(name);
  }

  public async close() {
    if (this.#doneInit && this.client) {
      await this.client.close();
      this.#doneInit = false;
    }
  }
}
export default MongoDB;
