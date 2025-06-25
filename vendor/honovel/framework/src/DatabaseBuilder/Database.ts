import { DatabaseConfig } from "../../../../../config/@types/database.d.ts";
// mysql
import mysql, {
  ConnectionOptions,
  Pool as MPool,
} from "npm:mysql2@^2.3.3/promise";
// sqlite
import MySQL from "./MySQL.ts";
import { Database as SqliteDB } from "jsr:@db/sqlite";
import SQlite from "./SQlite.ts";
// postgresql
import {
  Pool as PPool,
  TLSOptions,
} from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import PgSQL from "./PGSQL.ts";

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
type DDL = {
  message: string;
  affected?: number;
  raw: unknown;
};

type DML = {
  affected: number;
  lastInsertRowId: number | null;
  raw: unknown;
};

export interface QueryResultDerived {
  select: Record<string, unknown>[];
  pragma: Record<string, unknown>[];
  insert: DML;
  update: DML;
  delete: DML;
  create: DDL;
  alter: DDL;
  drop: DDL;
  truncate: DDL;
  rename: DDL;
}

// This is for RDBMS like MySQL, PostgreSQL, etc.
export class Database {
  public static client: SqliteDB | MPool | PPool | undefined;

  public async runQuery<T extends keyof QueryResultDerived>(
    query: string,
    params: unknown[] = []
  ): Promise<QueryResultDerived[T]> {
    await this.init();
    const dbType = env(
      "DB_CONNECTION",
      empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql"
    );
    if (dbType == "mysql") {
      return await MySQL.query<T>(Database.client as MPool, query, params);
    } else if (dbType == "sqlite") {
      return await SQlite.query<T>(Database.client as SqliteDB, query, params);
    } else if (dbType == "pgsql") {
      return await PgSQL.query<T>(Database.client as PPool, query, params);
    }
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  private async init(): Promise<void> {
    if (!isset(Database.client)) {
      const databaseObj = staticConfig("database") as DatabaseConfig;
      const dbType = env(
        "DB_CONNECTION",
        empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql"
      );
      switch (dbType) {
        case "sqlite": {
          //
          const dbConn = new SqliteDB(databasePath("database.sqlite"));
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
          const dbConn = databaseObj?.connections?.pgsql;
          if (!isset(dbConn)) {
            throw new Error("PostgreSQL connection configuration is missing.");
          }

          const secureConnection = {
            hostname: dbConn.host,
            port: dbConn.port,
            user: dbConn.user,
            password: dbConn.password,
            database: dbConn.database,
            tls:
              dbConn.ssl === true
                ? {} // enable TLS with default options
                : typeof dbConn.ssl === "object"
                ? (dbConn.ssl as Partial<TLSOptions>)
                : undefined, // if false or unset, disable TLS
            applicationName: dbConn.application_name,
            searchPath: Array.isArray(dbConn.searchPath)
              ? dbConn.searchPath
              : dbConn.searchPath
              ? [dbConn.searchPath]
              : undefined,
          };

          const maxConn =
            typeof dbConn.options?.maxConnection === "number"
              ? dbConn.options.maxConnection
              : 5;

          Database.client = new PPool(secureConnection, maxConn);
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
        await (Database.client as MPool).end();
      } catch (_) {
        console.error("Failed to close MySQL connection gracefully.");
      }
    } else if (dbType == "sqlite") {
      try {
        (Database.client as SqliteDB).close();
      } catch (_) {
        console.error("Failed to close SQLite connection gracefully.");
      }
    } else if (dbType == "pgsql") {
      try {
        await (Database.client as PPool).end();
      } catch (_) {
        console.error("Failed to release PostgreSQL client gracefully.");
      }
    }

    Database.client = undefined;
    console.log("Database connection closed gracefully.");
  }
  Deno.exit(0);
});
