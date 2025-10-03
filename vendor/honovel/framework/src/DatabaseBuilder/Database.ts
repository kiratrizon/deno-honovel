// mysql
import mysql, { ConnectionOptions, Pool as MPool } from "mysql2/promise";
// sqlite
import MySQL from "./MySQL.ts";

// postgresql
import { Pool as PgPool } from "@db/pgsql";
import PgSQL from "./PostgreSQL.ts";
import { Carbon } from "helpers";
import {
  MySQLConnectionConfigRaw,
  SupportedDrivers,
} from "configs/@types/index.d.ts";

// sqlsrv
import mssql from "mssql";
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

export const sqlReservedWords = [
  "add",
  "all",
  "alter",
  "and",
  "any",
  "as",
  "asc",
  "backup",
  "between",
  "by",
  "case",
  "check",
  "column",
  "constraint",
  "create",
  "database",
  "default",
  "delete",
  "desc",
  "distinct",
  "drop",
  "exec",
  "exists",
  "foreign",
  "from",
  "full",
  "group",
  "having",
  "if",
  "in",
  "index",
  "inner",
  "insert",
  "into",
  "is",
  "join",
  "key",
  "left",
  "like",
  "limit",
  "not",
  "null",
  "on",
  "or",
  "order",
  "outer",
  "primary",
  "procedure",
  "right",
  "rownum",
  "select",
  "set",
  "table",
  "top",
  "truncate",
  "union",
  "unique",
  "update",
  "values",
  "view",
  "where",
  "with",
];

// This is for RDBMS like MySQL, PostgreSQL, etc.
export class Database {
  public static client: MPool | PgPool | undefined;
  private static bindings: any[] = [Carbon]; // bindings that needs to use toString() method
  public static connections: Record<
    string,
    {
      driver: SupportedDrivers;
      read: (MPool | PgPool)[];
      write: (MPool | PgPool)[];
    }
  > = {};
  private readonly dbUsed: SupportedDrivers;
  constructor(private connection: string) {
    this.dbUsed = config("database").connections[this.connection]
      .driver as SupportedDrivers;
    if (!["mysql", "sqlite", "pgsql", "sqlsrv"].includes(this.dbUsed)) {
      throw new Error(`Unsupported database type: ${this.dbUsed}`);
    }
  }
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
    const dbType = this.dbUsed;

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
      const queryType = newQuery.trim().split(" ")[0].toLowerCase();
      const isReadQuery = Database.readQueries.includes(queryType);
      const useClient = isReadQuery
        ? Database.connections[this.connection].read
        : Database.connections[this.connection].write;
      const client = useClient[Math.floor(Math.random() * useClient.length)];
      if (!client) {
        throw new Error(
          `No ${dbType} client available for ${
            isReadQuery ? "read" : "write"
          } operations.`
        );
      }

      try {
        // @ts-ignore //
        return await mappedDBType[dbType.toLowerCase()].query(
          client,
          newQuery,
          newParams
        );
      } catch (error) {
        consoledeno.error(`Query failed: ${newQuery}`, `Params:`, newParams);
        throw error;
      }
    }
    throw new Error(`Unsupported database driver: ${dbType}`);
  }

  private static doneInit = false;
  public static async init(force: boolean = false): Promise<void> {
    if (Database.doneInit && !force) {
      return;
    }
    const dbObj = config("database");

    const connections = dbObj?.connections || {};
    if (!isset(connections) || !isObject(connections)) {
      throw new Error("Database connections are not configured properly.");
    }
    const connectionEntries = Object.entries(connections);
    for (const [key, value] of connectionEntries) {
      if (isset(env("DENO_DEPLOYMENT_ID")) && value.driver === "sqlite") {
        continue;
      }
      if (!isset(Database.connections[key]) && value.driver !== "mongodb") {
        Database.connections[key] = {
          driver: value.driver as SupportedDrivers,
          read: [],
          write: [],
        };
      }
      switch (value.driver) {
        case "mysql": {
          const forMySQL = value;
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
                  dateStrings: true, // MySQL date strings
                };
                if (isset(defaultOptions?.maxConnection)) {
                  poolParams.connectionLimit = defaultOptions.maxConnection;
                }
                Database.connections[key].write.push(
                  mysql.createPool(poolParams)
                );
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
                  dateStrings: true, // MySQL date strings
                };
                if (isset(defaultOptions?.maxConnection)) {
                  poolParams.connectionLimit = defaultOptions.maxConnection;
                }
                Database.connections[key].write.push(
                  mysql.createPool(poolParams)
                );
              });
            }

            if (
              !isset(forMySQL.read) ||
              (!empty(forMySQL.read) && !isObject(forMySQL.read))
            ) {
              Database.connections[key].read = Database.connections[key].write;
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
                  dateStrings: true, // MySQL date strings
                };
                if (isset(defaultOptions?.maxConnection)) {
                  poolParams.connectionLimit = defaultOptions.maxConnection;
                }
                Database.connections[key].read.push(
                  mysql.createPool(poolParams)
                );
              });
            }
          }
          break;
        }
        case "pgsql": {
          const forPgSQL = value;
          if (isset(forPgSQL)) {
            const defaultHosts = Array.isArray(forPgSQL.host)
              ? forPgSQL.host
              : [forPgSQL.host || "localhost"];

            const defaultPort = forPgSQL.port || 5432;
            const defaultDatabase = forPgSQL.database || "honovel";
            const defaultUser = forPgSQL.user || "postgres";
            const defaultPassword = forPgSQL.password || "";
            const defaultOptions = forPgSQL.options || {};

            // In clever setups: pick the first host as primary (for now)
            for (const host of defaultHosts) {
              const pool = new PgPool(
                {
                  hostname: host,
                  port: defaultPort,
                  user: defaultUser,
                  password: defaultPassword,
                  database: defaultDatabase,
                  ...defaultOptions,
                },
                // pool size (connections per host)
                5,
                true // lazy
              );

              Database.connections[key].write.push(pool);
            }

            // Mirror read/write if you don't separate them
            Database.connections[key].read = Database.connections[key].write;
          }
          break;
        }

        case "sqlite": {
          const forSQLite = value;
          if (isset(forSQLite)) {
            const dbPath =
              forSQLite.database || databasePath("database.sqlite");
            if (!dbPath) {
              throw new Error("Database path is not configured.");
            }
            const sqliteModule = await import("jsr:@db/sqlite");
            const SqliteDB = sqliteModule.Database;
            // @ts-ignore //
            Database.connections[key].write.push(new SqliteDB(dbPath));
            // @ts-ignore //
            Database.connections[key].read.push(new SqliteDB(dbPath));
          }
          break;
        }
        case "sqlsrv": {
          break;
        }
      }
    }
    this.doneInit = true;
  }

  private beforeQuery(query: string, params: any[] = []): [string, any[]] {
    const dbType = this.dbUsed;

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
      let line = `${this.quoteIdentifier(col.name)} ${this.mapColumnType(
        col,
        dbType
      )}`;

      if (col.options?.autoIncrement) {
        if (dbType === "mysql") {
          line += " AUTO_INCREMENT";
        } else if (dbType === "pgsql") {
          line = `${this.quoteIdentifier(col.name)} SERIAL`;
        } else if (dbType === "sqlite") {
          line = `${this.quoteIdentifier(
            col.name
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
            fkName
          )} FOREIGN KEY (${this.quoteIdentifier(
            col.name
          )}) REFERENCES ${this.quoteIdentifier(
            col.options.on
          )}(${this.quoteIdentifier(col.options.references)})`
        );
      }
    }

    const quotedTable = this.quoteIdentifier(schema.table);
    return `CREATE TABLE ${quotedTable} (\n  ${lines.join(",\n  ")}\n);`;
  }

  public generateAlterTableSQL(schema: TableSchema, dbType: DBType): string {
    const statements: string[] = [];

    const tableName = this.quoteIdentifier(schema.table);

    // Drop columns
    if (schema.drops?.length) {
      for (const colName of schema.drops) {
        const col = this.quoteIdentifier(colName);
        statements.push(`ALTER TABLE ${tableName} DROP COLUMN ${col}`);
      }
    }

    // Add columns
    for (const col of schema.columns) {
      let line = `${this.quoteIdentifier(col.name)} ${this.mapColumnType(
        col,
        dbType
      )}`;

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
            fkName
          )} FOREIGN KEY (${this.quoteIdentifier(
            col.name
          )}) REFERENCES ${this.quoteIdentifier(
            col.options.on
          )}(${this.quoteIdentifier(col.options.references)})`
        );
      }
    }

    return statements.join(";\n") + ";";
  }

  public insertOrUpdateBuilder(
    input: TInsertOrUpdateBuilder,
    uniqueKeys: string[]
  ): [string, unknown[]] {
    let columns = Object.keys(input.data);
    const values = columns.map((col) => input.data[col] || null);
    columns = columns.map((col) => this.quoteIdentifier(col));

    const placeholders = `(${columns.map(() => "?").join(", ")})`;

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
      const updates = columns
        .filter((col) => !uniqueKeys.includes(col))
        .map((col) => `${col}=EXCLUDED.${col}`)
        .join(", ");
      sql += ` ON CONFLICT (${uniqueKeys.join(", ")}) DO UPDATE SET ${updates}`;
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

  public quoteIdentifier(name: string): string {
    const dbType = this.dbUsed;
    if (!sqlReservedWords.includes(name.toLowerCase())) {
      return name; // No need to quote if not a reserved word
    }
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

  public updateBuilder(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>
  ): [string, unknown[]] {
    if (empty(table) || !isString(table)) {
      throw new Error("Table name must be a non-empty string.");
    }
    if (empty(data) || !isObject(data)) {
      throw new Error("Data must be a non-empty object.");
    }
    if (empty(where) || !isObject(where)) {
      throw new Error("Where clause must be a non-empty object.");
    }

    // Generate SET clause
    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(data)) {
      setClauses.push(`${this.quoteIdentifier(key)} = ?`);
      values.push(value);
    }

    // Generate WHERE clause
    const whereClauses: string[] = [];
    for (const [key, value] of Object.entries(where)) {
      whereClauses.push(`${this.quoteIdentifier(key)} = ?`);
      values.push(value);
    }

    const sql = `UPDATE ${this.quoteIdentifier(table)} SET ${setClauses.join(
      ", "
    )} WHERE ${whereClauses.join(" AND ")}`;

    return [sql, values];
  }
}

export const dbCloser = () => {
  const entries = Object.entries(Database.connections);
  for (const [driver, connections] of entries) {
    switch (driver as SupportedDrivers) {
      case "mysql":
      case "pgsql":
        for (const pool of [...connections.read, ...connections.write]) {
          pool
            .end()
            .then(() => {
              consoledeno.success(`Closed ${driver} pool successfully.`);
            })
            .catch((err: Error) => {
              consoledeno.error(`Error closing ${driver} pool:`, err);
            });
        }
        break;
      case "sqlite":
      case "sqlsrv":
        // No pooling to close
        break;
      default:
        consoledeno.warn(`Unknown database driver: ${driver}`);
        break;
    }
  }
  Deno.exit(0);
};

export class DatabaseHelper {
  private dbConfig = config("database");

  constructor(private connection: string) {}

  private async getConnectionConfig() {
    const connection = this.connection;
    const dbConfig = this.dbConfig.connections[connection];
    if (!dbConfig) {
      throw new Error(`Database connection "${connection}" not found.`);
    }
    const driver = dbConfig.driver;
    switch (driver) {
      case "mysql": {
        const fromReadOrWrite = dbConfig.read || dbConfig.write;
        const conf: Record<string, unknown> = {};
        if (isset(fromReadOrWrite)) {
          conf.host =
            (isArray(fromReadOrWrite.host)
              ? fromReadOrWrite.host[0]
              : fromReadOrWrite.host) ||
            dbConfig.host ||
            "localhost";
          conf.port = fromReadOrWrite.port || dbConfig.port || 3306;
          conf.user = fromReadOrWrite.user || dbConfig.user || "root";
          conf.password = fromReadOrWrite.password || dbConfig.password || "";
        } else {
          conf.host = dbConfig.host || "localhost";
          conf.port = dbConfig.port || 3306;
          conf.user = dbConfig.user || "root";
          conf.password = dbConfig.password || "";
        }
        const client = await mysql.createConnection(conf);
        return client as MPool;
      }
      case "pgsql": {
        const fromReadOrWrite = dbConfig.read || dbConfig.write;

        const conf = {
          hostname:
            (isArray(fromReadOrWrite?.host)
              ? fromReadOrWrite.host[0]
              : fromReadOrWrite?.host) ||
            dbConfig.host ||
            "localhost",
          port: fromReadOrWrite?.port || dbConfig.port || 5432,
          user: fromReadOrWrite?.user || dbConfig.user || "postgres",
          password: fromReadOrWrite?.password || dbConfig.password || "",
          database: "postgres",
        };

        const poolSize = dbConfig.poolSize || 5;

        // Lazy connect
        const pool = new PgPool(conf, poolSize, true);

        return pool;
      }
      case "sqlite": {
        const dbPath = dbConfig.database || databasePath("database.sqlite");
        const module = await import("jsr:@db/sqlite");
        const SqliteDB = module.Database;
        const client = new SqliteDB(dbPath);
        return client;
      }
      case "sqlsrv": {
        const fromReadOrWrite = dbConfig.read || dbConfig.write;
        const conf: Record<string, unknown> = {};
        if (isset(fromReadOrWrite)) {
          conf.server =
            (isArray(fromReadOrWrite.host)
              ? fromReadOrWrite.host[0]
              : fromReadOrWrite.host) ||
            dbConfig.host ||
            "localhost";
          conf.port = fromReadOrWrite.port || dbConfig.port || 1433;
          conf.user = fromReadOrWrite.user || dbConfig.user || "sa";
          conf.password = fromReadOrWrite.password || dbConfig.password || "";
        } else {
          conf.server = dbConfig.host || "localhost";
          conf.port = dbConfig.port || 1433;
          conf.user = dbConfig.user || "sa";
          conf.password = dbConfig.password || "";
        }
        conf.database = "master"; // SQL Server requires a database to connect
        const client = new mssql.ConnectionPool(conf);
        await client.connect();
        return client;
      }
    }

    throw new Error(`Unsupported database driver: ${dbConfig.driver}`);
  }

  public async askIfDBExist(): Promise<boolean> {
    const dbType = this.dbConfig.connections[this.connection].driver;
    const conn = await this.getConnectionConfig();
    switch (dbType) {
      case "mysql": {
        const sql = `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`;
        const result = await MySQL.query<"select">(conn, sql, [
          this.dbConfig.connections[this.connection].database,
        ]);
        await (conn as MPool).end();
        return result.length > 0;
      }
      case "pgsql": {
        const sql = `SELECT datname FROM pg_database WHERE datname = $1`;
        const result = await PgSQL.query<"select">(conn, sql, [
          this.dbConfig.connections[this.connection].database,
        ]);
        await (conn as PgPool).end();
        return result.length > 0;
      }
      case "sqlite": {
        return await pathExist(
          this.dbConfig.connections[this.connection].database
        );
      }
      case "sqlsrv": {
        // const sql = `SELECT name FROM sys.databases WHERE name = @dbName`;
        // const request = new mssql.Request(conn);
        // request.input("dbName", mssql.NVarChar, this.dbConfig.connections[connection].database);
        // const result = await request.query(sql);
        // return result.recordset.length > 0;
        return false;
      }
    }
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  public async createDatabase(): Promise<void> {
    const dbType = this.dbConfig.connections[this.connection].driver;
    const conn = await this.getConnectionConfig();
    const dbName = this.dbConfig.connections[this.connection].database;
    switch (dbType) {
      case "mysql": {
        const sql = `CREATE DATABASE IF NOT EXISTS \`${dbName}\``;
        await MySQL.query<"create">(conn, sql);
        await (conn as MPool).end();
        break;
      }
      case "pgsql": {
        const sql = `CREATE DATABASE \`${dbName}\``;
        await PgSQL.query<"create">(conn, sql);
        await (conn as PgPool).end();
        break;
      }
      case "sqlite": {
        // SQLite databases are created automatically when connecting
        break;
      }
      case "sqlsrv": {
        // SQL Server requires a different approach
        throw new Error("SQL Server database creation is not implemented yet.");
      }
    }
  }

  public getDatabaseName(): string {
    return this.dbConfig.connections[this.connection].database as string;
  }
}
