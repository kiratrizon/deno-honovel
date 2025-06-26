import {
  hashSync,
  compareSync,
} from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import {
  Blueprint,
  ColumnDefinition,
  DBType,
  TableSchema,
} from "../../Database/Schema/index.ts";

interface HashOptions {
  rounds?: number;
}

export class Hash {
  /**
   * Hash a value with optional rounds (cost factor).
   */
  public static make(value: string, options: HashOptions = {}): string {
    const rounds = options.rounds ?? 10;
    return hashSync(value, String(rounds));
  }

  /**
   * Compare a plain value with a hash.
   */
  public static check(value: string, hash: string): boolean {
    return compareSync(value, hash);
  }
}

import { Database, QueryResultDerived } from "Database";
import { Builder } from "../../Database/Query/index.ts";
export class Schema {
  public static async create(
    table: string,
    callback: (blueprint: Blueprint) => void
  ): Promise<void> {
    const blueprint = new Blueprint(table);
    callback(blueprint);
    // @ts-ignore //
    if (blueprint.drops.length) {
      throw new Error(
        "Schema creation does not support dropping columns. Use dropColumn method instead."
      );
    }
    const tableSchema: TableSchema = {
      table,
      // @ts-ignore //
      columns: blueprint.columns,
    };
    const dbType = env("DB_CONNECTION", "mysql");
    const stringedQuery = generateCreateTableSQL(tableSchema, dbType);
    await DB.statement(stringedQuery);
  }

  public static async dropIfExists(table: string): Promise<void> {
    const dbType = env("DB_CONNECTION", "mysql");

    let sql: string;

    switch (dbType) {
      case "mysql":
        sql = `DROP TABLE IF EXISTS \`${table}\`;`;
        break;
      case "sqlite":
      case "pgsql":
        sql = `DROP TABLE IF EXISTS "${table}";`;
        break;
      case "sqlsrv":
        sql = `DROP TABLE IF EXISTS [${table}];`;
        break;
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }

    await DB.statement(sql);
  }

  public static async table(
    table: string,
    callback: (blueprint: Blueprint) => void
  ): Promise<void> {
    const blueprint = new Blueprint(table);
    callback(blueprint);
    // @ts-ignore //
    const [drops, columns] = [blueprint.drops, blueprint.columns];
    const tableSchema: TableSchema = {
      drops,
      columns,
      table,
    };
    const dbType = env("DB_CONNECTION", "mysql");
    const stringedQuery = generateAlterTableSQL(tableSchema, dbType);
    await DB.statement(stringedQuery);
  }
}

function generateCreateTableSQL(schema: TableSchema, dbType: DBType): string {
  const lines: string[] = [];

  for (const col of schema.columns) {
    let line = `${quoteIdentifier(col.name, dbType)} ${mapColumnType(
      col,
      dbType
    )}`;

    if (col.options?.autoIncrement) {
      if (dbType === "mysql") {
        line += " AUTO_INCREMENT";
      } else if (dbType === "pgsql") {
        line = `${quoteIdentifier(col.name, dbType)} SERIAL`;
      } else if (dbType === "sqlite") {
        line = `${quoteIdentifier(
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
      line += ` DEFAULT ${formatDefaultValue(col.options.default)}`;
    }

    lines.push(line);

    if (
      col.type === "foreignId" &&
      col.options?.references &&
      col.options?.on
    ) {
      const fkName = `fk_${schema.table}_${col.name}`;
      lines.push(
        `CONSTRAINT ${quoteIdentifier(
          fkName,
          dbType
        )} FOREIGN KEY (${quoteIdentifier(
          col.name,
          dbType
        )}) REFERENCES ${quoteIdentifier(
          col.options.on,
          dbType
        )}(${quoteIdentifier(col.options.references, dbType)})`
      );
    }
  }

  const quotedTable = quoteIdentifier(schema.table, dbType);
  return `CREATE TABLE ${quotedTable} (\n  ${lines.join(",\n  ")}\n);`;
}

function mapColumnType(col: ColumnDefinition, dbType: DBType): string {
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

function quoteIdentifier(name: string, dbType: DBType): string {
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

function formatDefaultValue(value: unknown): string {
  if (typeof value === "string") return `${value}`;
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

function generateAlterTableSQL(schema: TableSchema, dbType: DBType): string {
  const statements: string[] = [];

  const tableName = quoteIdentifier(schema.table, dbType);

  // Drop columns
  if (schema.drops?.length) {
    for (const colName of schema.drops) {
      const col = quoteIdentifier(colName, dbType);
      statements.push(`ALTER TABLE ${tableName} DROP COLUMN ${col}`);
    }
  }

  // Add columns
  for (const col of schema.columns) {
    let line = `${quoteIdentifier(col.name, dbType)} ${mapColumnType(
      col,
      dbType
    )}`;

    if (!col.options?.nullable) line += " NOT NULL";
    if (col.options?.unique) line += " UNIQUE";
    if (col.options?.default !== undefined) {
      line += ` DEFAULT ${formatDefaultValue(col.options.default)}`;
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
        `ALTER TABLE ${tableName} ADD CONSTRAINT ${quoteIdentifier(
          fkName,
          dbType
        )} FOREIGN KEY (${quoteIdentifier(
          col.name,
          dbType
        )}) REFERENCES ${quoteIdentifier(
          col.options.on,
          dbType
        )}(${quoteIdentifier(col.options.references, dbType)})`
      );
    }
  }

  return statements.join(";\n") + ";";
}

export class DB {
  public static table(table: string) {
    if (empty(table) || !isString(table)) {
      throw new Error("Table name must be a non-empty string.");
    }
    return new TableInstance(table);
  }

  public static async statement(
    query: string,
    params: unknown[] = []
  ): Promise<boolean> {
    if (empty(query) || !isString(query)) {
      throw new Error("Query must be a non-empty string.");
    }
    const db = new Database();

    try {
      await db.runQuery(query, params);
      return true;
    } catch (error) {
      console.error("Database statement error:", error);
      throw error;
    }
  }

  public static async select(
    query: string,
    params: unknown[] = []
  ): Promise<QueryResultDerived["select"]> {
    if (empty(query) || !isString(query)) {
      throw new Error("Query must be a non-empty string.");
    }
    const queryType = query.trim().split(" ")[0].toLowerCase();
    if (queryType !== "select") {
      throw new Error("Query must be a SELECT statement.");
    }
    const db = new Database();

    try {
      const result = await db.runQuery<"select">(query, params);
      return result;
    } catch (error) {
      console.error("Database select error:", error);
      throw error;
    }
  }

  public static async insert(
    table: string,
    ...data: Record<string, unknown>[]
  ): Promise<QueryResultDerived["insert"]> {
    if (empty(table) || !isString(table)) {
      throw new Error("Table name must be a non-empty string.");
    }
    const instance = new TableInstance(table);
    return await instance.insert<"insert">(...data);
  }
}

class TableInstance {
  constructor(private tableName: string) {}

  // for insert operation
  public async insert<T extends "insert">(
    ...data: Record<string, unknown>[]
  ): Promise<QueryResultDerived[T]> {
    if (!empty(data) && data.every((item) => empty(item) || !isObject(item))) {
      throw new Error("Insert data must be a non-empty array of objects.");
    }
    const db = new Database();
    const [sql, values] = insertBuilder({ table: this.tableName, data });
    const result = await db.runQuery<T>(sql, values);
    return result;
  }

  // for query building
  public select(...fields: string[]) {
    return new Builder(this.tableName, fields);
  }
}

type TInsertBuilder = {
  table: string;
  data: Array<Record<string, unknown>>;
};

function insertBuilder(input: TInsertBuilder): [string, unknown[]] {
  const dbType = env("DB_CONNECTION", "mysql"); // mysql | sqlite | pgsql | sqlsrv

  if (!Array.isArray(input.data) || input.data.length === 0) {
    throw new Error("Insert data must be a non-empty array.");
  }

  const columns = Object.keys(input.data[0]);
  const rows = input.data;

  const placeholders = rows.map((_, rowIndex) => {
    if (dbType === "pgsql") {
      return `(${columns
        .map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`)
        .join(", ")})`;
    } else {
      return `(${columns.map(() => "?").join(", ")})`;
    }
  });

  const values = rows.flatMap((row) => columns.map((col) => row[col]));

  let sql = `INSERT INTO ${input.table} (${columns.join(
    ", "
  )}) VALUES ${placeholders.join(", ")}`;

  if (dbType === "pgsql") {
    sql += " RETURNING *";
  }

  return [sql, values];
}
