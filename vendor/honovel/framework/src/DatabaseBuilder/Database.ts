import { DatabaseConfig } from "../../../../../config/@types/database.d.ts";
import mysql, {
  ConnectionOptions,
  Pool,
  PoolConnection,
} from "npm:mysql2@^2.3.3/promise";
import MySQL from "./MySQL.ts";
import { Database as DB, RestBindParameters } from "jsr:@db/sqlite";
import SQlite from "./SQlite.ts";

export type QueryResult =
  | Record<string, unknown>[]
  | {
      affected: number;
      lastInsertRowId: number | null;
      raw: unknown;
    }
  | {
      message: string;
      affected?: number;
      raw: unknown;
    };
type create = {
  message: string;
  affected?: number;
  raw: unknown;
};
type insertUpdateDelete = {
  affected: number;
  lastInsertRowId: number | null;
  raw: unknown;
};
export interface QueryResultDerived {
  select: Record<string, unknown>[];
  pragma: Record<string, unknown>[];
  insert: insertUpdateDelete;
  update: insertUpdateDelete;
  delete: insertUpdateDelete;
  create: create;
  alter: create;
  drop: create;
  truncate: create;
  rename: create;
}
// This is for RDBMS like MySQL, PostgreSQL, etc.
export class Database {
  public static client: unknown;

  public async runQuery<T extends keyof QueryResultDerived>(
    query: string,
    params: unknown[] = []
  ): Promise<QueryResultDerived[T]> {
    this.init();
    const dbType = env(
      "DB_CONNECTION",
      empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql"
    );
    if (dbType == "mysql") {
      return await MySQL.query<T>(
        Database.client as Pool | PoolConnection,
        query,
        params
      );
    } else if (dbType == "sqlite") {
      return await SQlite.query<T>(Database.client as DB, query, params);
    }
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  private init(): void {
    if (!isset(Database.client)) {
      const databaseObj = staticConfig("database") as DatabaseConfig;
      const dbType = env(
        "DB_CONNECTION",
        empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql"
      );
      switch (dbType) {
        case "sqlite": {
          //
          const dbConn = new DB(databasePath("database.sqlite"));
          if (!isset(dbConn)) {
            throw new Error("SQLite database connection failed.");
          }
          Database.client = dbConn;
          break;
        }
        case "mysql": {
          //
          const dbConn = databaseObj?.connections?.mysql;
          if (!isset(dbConn)) {
            throw new Error("MySQL connection configuration is missing.");
          }

          const secureConnection: Partial<ConnectionOptions> = {
            host: dbConn.host,
            port: dbConn.port,
            user: dbConn.user,
            password: dbConn.password,
            database: dbConn.database,
            charset: dbConn.charset || "utf8mb4",
          };
          if (isset(dbConn.timezone)) {
            secureConnection.timezone = dbConn.timezone;
          }
          if (isset(dbConn.ssl)) {
            secureConnection.ssl = dbConn.ssl;
          }
          if (isset(dbConn.options) && !empty(dbConn.options)) {
            const opts = dbConn.options;
            if (opts.maxConnection) {
              secureConnection.connectionLimit = opts.maxConnection;
            }
          }
          Database.client = mysql.createPool(secureConnection);
          break;
        }
        case "pgsql": {
          //
          break;
        }
        case "sqlsrv": {
          //
          break;
        }
      }
    }
  }
}

Deno.addSignalListener("SIGINT", async () => {
  const dbType = env(
    "DB_CONNECTION",
    empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql"
  );
  if (Database.client) {
    if (dbType == "mysql") {
      try {
        await (Database.client as Pool | PoolConnection).end();
      } catch (_) {
        console.error("Failed to close MySQL connection gracefully.");
      }
    }

    Database.client = undefined;
    console.log("Database connection closed gracefully.");
  }
  Deno.exit(0);
});
