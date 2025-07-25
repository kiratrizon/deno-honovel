// mysql
import mysql, {
  ConnectionOptions,
  Pool as MPool,
} from "npm:mysql2@^3.6.0/promise";
// sqlite
import MySQL from "./MySQL.ts";

// postgresql
import {
  Pool as PPool,
  TLSOptions,
} from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import PgSQL from "./PostgreSQL.ts";
import { Carbon } from "honovel:helpers";
import {
  MySQLConnectionConfigRaw,
  SupportedDrivers,
} from "configs/@types/index.d.ts";
import {
  ColumnDefinition,
  DBType,
  TableSchema,
} from "Illuminate/Database/Schema/index.ts";

type TInsertOrUpdateBuilder = {
  table: string;
  data: Record<string, unknown>;
};

const mappedDBType: Record<string, MySQL | PgSQL> = {
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
  use: TCL; // e.g., USE database_name;
}

// This is for RDBMS like MySQL, PostgreSQL, etc.
export class Database {
  public static client: MPool | PPool | undefined;
  // deno-lint-ignore no-explicit-any
  private static bindings: any[] = [Carbon]; // bindings that needs to use toString() method
  public static connections: Record<
    SupportedDrivers,
    {
      read: (MPool | PPool)[];
      write: (MPool | PPool)[];
    }
  > = {
    mysql: { read: [], write: [] },
    pgsql: { read: [], write: [] },
    sqlite: { read: [], write: [] },
    sqlsrv: { read: [], write: [] },
  };
  constructor(private dbUsed = staticConfig("database").default) {}
  private static readQueries: string[] = [
    "select",
    "pragma", // SQLite
    "explain",
    "show",
    "describe", // MySQL synonym for SHOW COLUMNS
    "with", // CTE (Common Table Expressions), often used with SELECT
    "values", // SELECT-like in PostgreSQL: `VALUES (1), (2)`
  ];

  public async runQuery<T extends keyof QueryResultDerived>(
    query: string,
    params: unknown[] = []
  ): Promise<QueryResultDerived[T]> {
    await Database.init();
    const dbType = this.dbUsed || staticConfig("database").default || "mysql";

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
      let client;
      if (dbType === "sqlite") {
        const sqliteModule = await import("jsr:@db/sqlite");
        const SqliteDB = sqliteModule.Database;
        const dbConn = new SqliteDB(databasePath("database.sqlite"));
        client = dbConn;
      } else {
        const queryType = newQuery.trim().split(" ")[0].toLowerCase();
        const isReadQuery = Database.readQueries.includes(queryType);
        const useClient = isReadQuery
          ? Database.connections[dbType].read
          : Database.connections[dbType].write;
        client = useClient[Math.floor(Math.random() * useClient.length)];
        if (!client) {
          throw new Error(
            `No ${dbType} client available for ${
              isReadQuery ? "read" : "write"
            } operations.`
          );
        }
      }

      // @ts-ignore //
      return await mappedDBType[dbType.toLowerCase()].query(
        client,
        newQuery,
        newParams
      );
    }
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  private static doneInit = false;
  public static async init(force: boolean = false): Promise<void> {
    if (Database.doneInit && !force) {
      return;
    }
    const dbObj = staticConfig("database");
    const forMySQL = dbObj?.connections?.mysql;
    if (isset(forMySQL)) {
      const defaultPassword = forMySQL.password || "";
      const defaultHost = isArray(forMySQL.host)
        ? forMySQL.host
        : [forMySQL.host || "localhost"];
      const defaultPort = forMySQL.port || 3306;
      const defaultDatabase = forMySQL.database;
      const defaultUser = forMySQL.user || "root";
      const defaultCharset = forMySQL.charset || "utf8mb4";
      const defaultSSL = forMySQL.ssl;
      const defaultOptions: MySQLConnectionConfigRaw["options"] =
        forMySQL.options;
      if (
        !isset(forMySQL.write) ||
        (!empty(forMySQL.write) && !isObject(forMySQL.write))
      ) {
        defaultHost.forEach((host) => {
          const poolParams: Partial<ConnectionOptions> = {
            host,
            port: defaultPort,
            user: defaultUser,
            password: defaultPassword,
            database: defaultDatabase,
            charset: defaultCharset,
            ssl: defaultSSL,
          };
          if (isset(defaultOptions?.maxConnection)) {
            poolParams.connectionLimit = defaultOptions.maxConnection;
          }
          Database.connections.mysql.write.push(mysql.createPool(poolParams));
        });
      } else {
        const writeHosts = isArray(forMySQL.write?.host)
          ? forMySQL.write.host
          : [forMySQL.write?.host || "localhost"];
        writeHosts.forEach((host) => {
          const poolParams: Partial<ConnectionOptions> = {
            host,
            port: forMySQL.write?.port || defaultPort,
            user: forMySQL.write?.user || defaultUser,
            password: forMySQL.write?.password || defaultPassword,
            database: forMySQL.write?.database || defaultDatabase,
            charset: forMySQL.write?.charset || defaultCharset,
            ssl: forMySQL.write?.ssl || defaultSSL,
          };
          if (isset(defaultOptions?.maxConnection)) {
            poolParams.connectionLimit = defaultOptions.maxConnection;
          }
          Database.connections.mysql.write.push(mysql.createPool(poolParams));
        });
      }

      if (
        !isset(forMySQL.read) ||
        (!empty(forMySQL.read) && !isObject(forMySQL.read))
      ) {
        Database.connections.mysql.read = Database.connections.mysql.write;
      } else {
        const readHosts = isArray(forMySQL.read?.host)
          ? forMySQL.read.host
          : [forMySQL.read?.host || "localhost"];
        readHosts.forEach((host) => {
          const poolParams: Partial<ConnectionOptions> = {
            host,
            port: forMySQL.read?.port || defaultPort,
            user: forMySQL.read?.user || defaultUser,
            password: forMySQL.read?.password || defaultPassword,
            database: forMySQL.read?.database || defaultDatabase,
            charset: forMySQL.read?.charset || defaultCharset,
            ssl: forMySQL.read?.ssl || defaultSSL,
          };
          if (isset(defaultOptions?.maxConnection)) {
            poolParams.connectionLimit = defaultOptions.maxConnection;
          }
          Database.connections.mysql.read.push(mysql.createPool(poolParams));
        });
      }
    }
    const forPgSQL = dbObj?.connections?.pgsql;
    if (isset(forPgSQL)) {
      // to be implemented later
    }
    this.doneInit = true;
  }

  // deno-lint-ignore no-explicit-any
  private beforeQuery(query: string, params: any[] = []): [string, any[]] {
    const dbType = this.dbUsed || staticConfig("database").default || "mysql";

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
    });
    return [result, newParams];
  }

  public generateCreateTableSQL(schema: TableSchema, dbType: DBType): string {
    const lines: string[] = [];

    for (const col of schema.columns) {
      let line = `${this.quoteIdentifier(
        col.name,
        dbType
      )} ${this.mapColumnType(col, dbType)}`;

      if (col.options?.autoIncrement) {
        if (dbType === "mysql") {
          line += " AUTO_INCREMENT";
        } else if (dbType === "pgsql") {
          line = `${this.quoteIdentifier(col.name, dbType)} SERIAL`;
        } else if (dbType === "sqlite") {
          line = `${this.quoteIdentifier(
            col.name,
            dbType
          )} INTEGER PRIMARY KEY AUTOINCREMENT`;
          // Note: SQLite only allows AUTOINCREMENT on the primary key
        } else if (dbType === "sqlsrv") {
          line += " IDENTITY(1,1)";
        }
      }

      // Apply PRIMARY KEY only if it's not already handled (e.g., SQLite auto-increment case)
      if (
        col.options?.primary &&
        !(dbType === "sqlite" && col.options.autoIncrement)
      ) {
        line += " PRIMARY KEY";
      }

      if (
        isObject(col.options) &&
        keyExist(col.options, "nullable") &&
        !col.options?.nullable
      ) {
        line += " NOT NULL";
      }

      if (col.options?.unique) {
        line += " UNIQUE";
      }

      if (col.options?.default !== undefined) {
        line += ` DEFAULT ${this.formatDefaultValue(col.options.default)}`;
      }

      lines.push(line);

      if (
        col.type === "foreignId" &&
        col.options?.references &&
        col.options?.on
      ) {
        const fkName = `fk_${schema.table}_${col.name}`;
        lines.push(
          `CONSTRAINT ${this.quoteIdentifier(
            fkName,
            dbType
          )} FOREIGN KEY (${this.quoteIdentifier(
            col.name,
            dbType
          )}) REFERENCES ${this.quoteIdentifier(
            col.options.on,
            dbType
          )}(${this.quoteIdentifier(col.options.references, dbType)})`
        );
      }
    }

    const quotedTable = this.quoteIdentifier(schema.table, dbType);
    return `CREATE TABLE ${quotedTable} (\n  ${lines.join(",\n  ")}\n);`;
  }

  public generateAlterTableSQL(schema: TableSchema, dbType: DBType): string {
    const statements: string[] = [];

    const tableName = this.quoteIdentifier(schema.table, dbType);

    // Drop columns
    if (schema.drops?.length) {
      for (const colName of schema.drops) {
        const col = this.quoteIdentifier(colName, dbType);
        statements.push(`ALTER TABLE ${tableName} DROP COLUMN ${col}`);
      }
    }

    // Add columns
    for (const col of schema.columns) {
      let line = `${this.quoteIdentifier(
        col.name,
        dbType
      )} ${this.mapColumnType(col, dbType)}`;

      if (!col.options?.nullable) line += " NOT NULL";
      if (col.options?.unique) line += " UNIQUE";
      if (col.options?.default !== undefined) {
        line += ` DEFAULT ${this.formatDefaultValue(col.options.default)}`;
      }

      statements.push(`ALTER TABLE ${tableName} ADD COLUMN ${line}`);

      // Foreign key (only valid in some DBs like MySQL/PG)
      if (
        col.type === "foreignId" &&
        col.options?.references &&
        col.options?.on
      ) {
        const fkName = `fk_${schema.table}_${col.name}`;
        statements.push(
          `ALTER TABLE ${tableName} ADD CONSTRAINT ${this.quoteIdentifier(
            fkName,
            dbType
          )} FOREIGN KEY (${this.quoteIdentifier(
            col.name,
            dbType
          )}) REFERENCES ${this.quoteIdentifier(
            col.options.on,
            dbType
          )}(${this.quoteIdentifier(col.options.references, dbType)})`
        );
      }
    }

    return statements.join(";\n") + ";";
  }

  public insertOrUpdateBuilder(
    input: TInsertOrUpdateBuilder,
    uniqueKeys: string[]
  ): [string, unknown[]] {
    const columns = Object.keys(input.data);
    const values = columns.map((col) => input.data[col]);

    const placeholders =
      this.dbUsed === "pgsql"
        ? `(${columns.map((_, idx) => `$${idx + 1}`).join(", ")})`
        : `(${columns.map(() => "?").join(", ")})`;

    let sql = `INSERT INTO ${input.table} (${columns.join(
      ", "
    )}) VALUES ${placeholders}`;

    if (this.dbUsed === "mysql") {
      const updates = columns
        .filter((col) => !uniqueKeys.includes(col))
        .map((col) => `${col}=VALUES(${col})`)
        .join(", ");

      sql += ` ON DUPLICATE KEY UPDATE ${updates}`;
    } else if (this.dbUsed === "pgsql") {
      const conflictTargets = uniqueKeys.join(", ");
      const updates = columns
        .filter((col) => !uniqueKeys.includes(col))
        .map((col) => `${col}=EXCLUDED.${col}`)
        .join(", ");

      sql += ` ON CONFLICT (${conflictTargets}) DO UPDATE SET ${updates} RETURNING *`;
    } else if (this.dbUsed === "sqlite") {
      const updates = columns
        .filter((col) => !uniqueKeys.includes(col))
        .map((col) => `${col}=excluded.${col}`)
        .join(", ");

      sql += ` ON CONFLICT (${uniqueKeys.join(", ")}) DO UPDATE SET ${updates}`;
    } else if (this.dbUsed === "sqlsrv") {
      throw new Error(
        "Insert or Update is not natively supported in SQL Server in this builder."
      );
    }

    return [sql, values];
  }

  private quoteIdentifier(name: string, dbType: DBType): string {
    switch (dbType) {
      case "mysql":
        return `\`${name}\``;
      case "sqlite":
        return `\"${name}\"`;
      case "pgsql":
        return `\"${name}\"`;
      case "sqlsrv":
        return `[${name}]`;
    }
  }

  private formatDefaultValue(value: unknown): string {
    if (typeof value === "string") return `${value}`;
    if (typeof value === "boolean") return value ? "1" : "0";
    return String(value);
  }

  private mapColumnType(col: ColumnDefinition, dbType: DBType): string {
    switch (col.type) {
      case "string": {
        const len = col.options?.length || 255;
        return `VARCHAR(${len})`;
      }
      case "text":
        return "TEXT";
      case "integer":
        return dbType === "pgsql" ? "INTEGER" : "INT";
      case "boolean":
        return dbType === "pgsql" ? "BOOLEAN" : "TINYINT(1)";
      case "timestamp":
        if (dbType === "mysql") return "TIMESTAMP";
        return "TIMESTAMP";
      case "foreignId":
        return dbType === "pgsql" ? "INTEGER" : "INT";
      default:
        throw new Error(`Unsupported column type: ${col.type}`);
    }
  }
}

export const dbCloser = async () => {
  const entries = Object.entries(Database.connections);
  for (const [driver, connections] of entries) {
    switch (driver as SupportedDrivers) {
      case "mysql":
      case "pgsql":
        for (const pool of [...connections.read, ...connections.write]) {
          try {
            await pool.end();
          } catch (e) {
            console.error(`[${driver}] Error closing pool:`, e);
          }
        }
        Deno.exit(0);
        break;
      case "sqlite":
      case "sqlsrv":
        // No pooling to close
        break;
      default:
        console.warn(`Unknown database driver: ${driver}`);
        break;
    }
  }
};

Deno.addSignalListener("SIGINT", dbCloser);

// if not windows, add SIGTERM listener
if (Deno.build.os !== "windows") {
  Deno.addSignalListener("SIGTERM", dbCloser);
}
