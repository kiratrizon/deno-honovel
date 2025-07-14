// mysql
import mysql, {
  ConnectionOptions,
  Pool as MPool,
} from "npm:mysql2@^2.3.3/promise";
// sqlite
import MySQL from "./MySQL.ts";

// postgresql
import {
  Pool as PPool,
  TLSOptions,
} from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import PgSQL from "./PostgreSQL.ts";
import { Carbon } from "honovel:helpers";

const mappedDBType: Record<string, unknown> = {
  mysql: MySQL,
  pgsql: PgSQL,
  // sqlsrv: "sqlsrv",
};
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

type DQL = Record<string, unknown>[] | [];

type TCL = {
  message: string;
  raw: unknown;
};

export interface QueryResultDerived {
  // DQL: Data Query Language
  select: DQL;
  pragma: DQL;
  explain: DQL;
  show: DQL;
  describe: DQL;

  // DML: Data Manipulation Language
  insert: DML;
  update: DML;
  delete: DML;
  replace: DML;
  merge: DML;

  // DDL: Data Definition Language
  create: DDL;
  alter: DDL;
  drop: DDL;
  truncate: DDL;
  rename: DDL;

  // TCL: Transaction Control Language
  begin: TCL;
  commit: TCL;
  rollback: TCL;
  savepoint: TCL;
  release: TCL;
  set: TCL; // e.g., SET AUTOCOMMIT=0;
}

// This is for RDBMS like MySQL, PostgreSQL, etc.
export class Database {
  public static client: MPool | PPool | undefined;
  private static bindings: any[] = [
    Carbon
  ];
  public async runQuery<T extends keyof QueryResultDerived>(
    query: string,
    params: unknown[] = []
  ): Promise<QueryResultDerived[T]> {
    await Database.init();
    const dbType = env(
      "DB_CONNECTION",
      empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql"
    );

    if (
      !isset(env("DENO_DEPLOYMENT_ID")) &&
      dbType === "sqlite" &&
      !mappedDBType.sqlite
    ) {
      const localSQlite = await import("./SQlite.ts");
      const SQlite = localSQlite.default;
      mappedDBType.sqlite = SQlite;
    }

    const [newQuery, newParams] = this.beforeQuery(query, params);
    const dbKeys = Object.keys(mappedDBType);
    if (dbKeys.includes(dbType.toLowerCase())) {
      // @ts-ignore //
      return await mappedDBType[dbType.toLowerCase()].query(
        Database.client,
        newQuery,
        newParams
      );
    }
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  public static async init(force: boolean = false): Promise<void> {
    if (!isset(Database.client) || force) {
      const databaseObj = staticConfig("database");
      const dbType = env(
        "DB_CONNECTION",
        empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql"
      );
      switch (dbType) {
        case "sqlite": {
          // @ts-ignore //
          const sqliteModule = await import("jsr:@db/sqlite");
          const SqliteDB = sqliteModule.Database;
          const dbConn = new SqliteDB(databasePath("database.sqlite"));
          if (!isset(dbConn)) {
            throw new Error("SQLite database connection failed.");
          }
          // @ts-ignore //
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

  private beforeQuery(query: string, params: any[] = []): [string, any[]] {
    const dbType = staticConfig("database").default || "mysql";

    let index = 0;
    let result = "";
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < query.length; i++) {
      const char = query[i];
      const nextChar = query[i + 1];

      // Handle escape characters (e.g., 'It\'s')
      if (char === "\\" && (nextChar === "'" || nextChar === '"')) {
        result += char + nextChar;
        i++; // Skip next character
        continue;
      }

      // Toggle single quote
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        result += char;
        continue;
      }

      // Toggle double quote
      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        result += char;
        continue;
      }

      // Replace only unquoted ?
      if (char === "?" && !inSingleQuote && !inDoubleQuote) {
        switch (dbType) {
          case "pgsql":
            result += `$${++index}`;
            break;
          case "sqlsrv":
            result += `@p${++index}`;
            break;
          case "mysql":
          case "sqlite":
          default:
            result += "?";
            break;
        }
        continue;
      }

      result += char;
    }
    const newParams = params.map((param) => {
      const isBinded = Database.bindings.some((binding) => {
        return param instanceof binding;
      });
      if (isBinded) {
        return param.toString();
      }
      return param;
    })
    return [result, newParams];
  }
}

export const dbCloser = async () => {
  const dbType = env(
    "DB_CONNECTION",
    empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql"
  );
  if (Database.client) {
    if (dbType == "mysql") {
      try {
        await (Database.client as MPool).end();
      } catch (_) {
        console.error(`Error closing ${dbType} connection:`, _);
      }
    } else if (dbType == "sqlite") {
      try {
        // @ts-ignore //
        // Database.client.close();
      } catch (_) {
        console.error(`Error closing ${dbType} connection:`, _);
      }
    } else if (dbType == "pgsql") {
      try {
        await (Database.client as PPool).end();
      } catch (_) {
        console.error(`Error closing ${dbType} connection:`, _);
      }
    }

    Database.client = undefined;
  }
  Deno.exit(0);
};

Deno.addSignalListener("SIGINT", dbCloser);
