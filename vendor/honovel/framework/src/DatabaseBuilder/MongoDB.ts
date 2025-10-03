import { MongoClient, Collection, Document } from "mongodb";
import { MongoConnectionConfig } from "configs/@types/index.d.ts";

class MongoDB {
  private client: MongoClient;
  private readonly database: string;
  private readonly dbAuth?: string;
  #doneInit = false;

  constructor(conf: MongoConnectionConfig) {
    this.client = new MongoClient(conf.uri as string);
    this.database = conf.database;
    if (conf.options?.database) {
      this.dbAuth = conf.options.database;
    }
  }

  public async connect() {
    if (!this.#doneInit) {
      try {
        if (isset(this.dbAuth)) {
          await this.client.db(this.dbAuth).command({ ping: 1 });
        }
        await this.client.connect();
        this.#doneInit = true;
      } catch (error) {
        consoledeno.error("Failed to connect to MongoDB:", error);
        throw error;
      }
    }
  }

  public collection<T extends Document = Document>(
    name: string
  ): Collection<T> {
    return this.client.db(this.database).collection<T>(name);
  }

  public async close() {
    if (this.#doneInit) {
      await this.client.close();
      this.#doneInit = false;
    }
  }
}
export default MongoDB;
