import { MongoClient, Collection, Document } from "mongodb";

class MongoDB {
  private client: MongoClient;
  private readonly database: string;
  private readonly dbAuth?: string;
  #doneInit = false;

  constructor({
    uri,
    database,
    options = {},
  }: {
    uri: string;
    database: string;
    options?: { database?: string };
  }) {
    this.client = new MongoClient(uri);
    this.database = database;
    if (options.database) {
      this.dbAuth = options.database;
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
        console.error("Failed to connect to MongoDB:", error);
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
