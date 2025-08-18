import {
  MongoClient,
  Collection,
  Database,
  type Document,
  ConnectOptions,
} from "@db/mongo";
import { MongoConnectionConfig } from "configs/@types/index.d.ts";

class MongoDB {
  private readonly client: MongoClient;
  private db?: Database;
  #doneInit = false;

  constructor(private conf: MongoConnectionConfig) {
    this.client = new MongoClient();
  }

  public async connect() {
    if (!this.#doneInit) {
      if (isset(this.conf.uri)) {
        this.db = await this.client.connect(this.conf.uri);
      } else {
        const { host, port, username, password, database, options, tls } =
          this.conf;
        if (!isset(host) || !isset(port) || !isset(database)) {
          throw new Error("MongoDB connection configuration is incomplete.");
        }
        const objConnection: ConnectOptions = {
          db: database,
          tls: tls || false,
          servers: [
            {
              host: host,
              port: port,
            },
          ],
          credential: {
            username: username,
            password: password,
            db: options?.database || "admin",
            mechanism: options?.mechanism || "SCRAM-SHA-1",
          },
        };
        this.db = await this.client.connect(objConnection);
      }
      this.#doneInit = true;
    }
  }

  public collection<T extends Document = Document>(
    name: string
  ): Collection<T> {
    if (!this.#doneInit || !this.db) {
      throw new Error("MongoDB not connected yet. Call connect() first.");
    }
    return this.db.collection<T>(name);
  }

  public async close() {
    if (this.#doneInit) {
      this.client.close();
      this.#doneInit = false;
    }
  }
}

export default MongoDB;
