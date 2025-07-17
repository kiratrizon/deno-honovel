import {
  genSaltSync,
  hashSync,
  compareSync,
} from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import {
  Blueprint,
  ColumnDefinition,
  DBType,
  TableSchema,
} from "../../Database/Schema/index.ts";
import BaseController from "Illuminate/Routing/BaseController";
import { plural, singular } from "https://deno.land/x/deno_plural/mod.ts";
import authConf from "../../../../../../../config/auth.ts";
import {
  Authenticatable,
  JwtGuard,
  SessionGuard,
  TokenGuard,
} from "Illuminate/Contracts/Auth/index.ts";

import {
  IRoute,
  IMethodRoute,
  IGroupParams,
  IEGroupRoute,
  IReferencesRoute,
  IChildRoutes,
  IHeaderChildRoutes,
  ICallback,
} from "../../../../../@types/declaration/IRoute.d.ts";
import MethodRoute from "../../../hono/Support/MethodRoute.ts";
import GR from "../../../hono/Support/GroupRoute.ts";
import { regexObj } from "../../../hono/Support/FunctionRoute.ts";
import ResourceRoute, {
  IResourceRouteConf,
} from "../../../hono/Support/ResourceRoute.ts";
import { Database, QueryResultDerived } from "Database";
import { Builder, SQLRaw } from "../../Database/Query/index.ts";
import { FormFile } from "https://deno.land/x/multiparser@0.114.0/mod.ts";
interface HashOptions {
  rounds?: number;
}

export class Hash {
  /**
   * Hash a value with optional rounds (cost factor).
   */
  public static make(value: string, options: HashOptions = {}): string {
    const rounds = genSaltSync(options.rounds || 10);
    return hashSync(value, rounds);
  }

  /**
   * Compare a plain value with a hash.
   */
  public static check(value: string, hash: string): boolean {
    return compareSync(value, hash);
  }
}

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
    const dbType = staticConfig("database").default;
    const stringedQuery = generateCreateTableSQL(tableSchema, dbType);
    await DB.statement(stringedQuery);
  }

  public static async hasTable(table: string): Promise<boolean> {
    const dbType = staticConfig("database").default.toLowerCase();
    let query = "";

    switch (dbType) {
      case "mysql":
        query = `SHOW TABLES LIKE '${table}'`;
        break;
      case "sqlite":
        query = `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`;
        break;
      case "postgres":
      case "pgsql":
      case "postgresql":
        query = `SELECT to_regclass('${table}')`;
        break;
      case "sqlserver":
        query = `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${table}'`;
        break;
      default:
        throw new Error(`Unsupported DB_CONNECTION: ${dbType}`);
    }

    const result = await DB.select(query);

    if (!result || result.length === 0) {
      return false;
    }

    // Special handling for PostgreSQL because to_regclass can return null
    if (
      dbType.includes("postgres") &&
      (!result[0] || Object.values(result[0])[0] === null)
    ) {
      return false;
    }

    return true;
  }

  public static async dropIfExists(table: string): Promise<void> {
    const dbType = staticConfig("database").default;

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
    const dbType = staticConfig("database").default;
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
    if (["select", "show", "pragma"].indexOf(queryType) === -1) {
      throw new Error("Only SELECT, SHOW, and PRAGMA queries are allowed.");
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

  public static async insertOrUpdate(
    table: string,
    data: Record<string, unknown>,
    uniqueKeys: string[] = []
  ) {
    if (empty(table) || !isString(table)) {
      throw new Error("Table name must be a non-empty string.");
    }
    if (empty(data) || !isObject(data)) {
      throw new Error("Data must be a non-empty objects.");
    }

    const db = new Database();
    const [sql, values] = insertOrUpdateBuilder({ table, data }, uniqueKeys);
    const result = await db.runQuery<"insert">(sql, values);
    return result;
  }

  public static raw(query: string): SQLRaw {
    if (empty(query) || !isString(query)) {
      throw new Error("Raw query must be a non-empty string.");
    }
    return new SQLRaw(query);
  }

  public static async reconnect(): Promise<void> {
    await Database.init(true);
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

  public where(...args: any[]): Builder {
    // @ts-ignore //
    return new Builder(this.tableName).where(...args);
  }
}

type TInsertBuilder = {
  table: string;
  data: Array<Record<string, unknown>>;
};

function insertBuilder(input: TInsertBuilder): [string, unknown[]] {
  const dbType = staticConfig("database").default; // mysql | sqlite | pgsql | sqlsrv

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

type TInsertOrUpdateBuilder = {
  table: string;
  data: Record<string, unknown>;
};

export function insertOrUpdateBuilder(
  input: TInsertOrUpdateBuilder,
  uniqueKeys: string[]
): [string, unknown[]] {
  const dbType = staticConfig("database").default;

  const columns = Object.keys(input.data);
  const values = columns.map((col) => input.data[col]);

  const placeholders =
    dbType === "pgsql"
      ? `(${columns.map((_, idx) => `$${idx + 1}`).join(", ")})`
      : `(${columns.map(() => "?").join(", ")})`;

  let sql = `INSERT INTO ${input.table} (${columns.join(
    ", "
  )}) VALUES ${placeholders}`;

  if (dbType === "mysql") {
    const updates = columns
      .filter((col) => !uniqueKeys.includes(col))
      .map((col) => `${col}=VALUES(${col})`)
      .join(", ");

    sql += ` ON DUPLICATE KEY UPDATE ${updates}`;
  } else if (dbType === "pgsql") {
    const conflictTargets = uniqueKeys.join(", ");
    const updates = columns
      .filter((col) => !uniqueKeys.includes(col))
      .map((col) => `${col}=EXCLUDED.${col}`)
      .join(", ");

    sql += ` ON CONFLICT (${conflictTargets}) DO UPDATE SET ${updates} RETURNING *`;
  } else if (dbType === "sqlite") {
    const updates = columns
      .filter((col) => !uniqueKeys.includes(col))
      .map((col) => `${col}=excluded.${col}`)
      .join(", ");

    sql += ` ON CONFLICT (${uniqueKeys.join(", ")}) DO UPDATE SET ${updates}`;
  } else if (dbType === "sqlsrv") {
    throw new Error(
      "Insert or Update is not natively supported in SQL Server in this builder."
    );
  }

  return [sql, values];
}

interface IRegex {
  digit: string;
  alpha: string;
  alphanumeric: string;
  alphanumericspecial: string;
  slug: string;
  uuid: string;
}
export class Validator {
  #validRules = [
    "required",
    "email",
    "min",
    "max",
    "unique",
    "confirmed",
    "regex",
    "file",
  ];
  #regex = {
    digit: "\\d+",
    alpha: "[a-zA-Z]+",
    alphanumeric: "[a-zA-Z0-9]+",
    alphanumericspecial: "^[a-zA-Z0-9@#\\$%\\-_\\.!\\*]+$",
    slug: "[a-z0-9-]+",
    uuid: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
  };

  static async make(
    data: Record<string, unknown> = {},
    validations: Record<string, string> = {}
  ) {
    const v = new Validator(data, validations);
    await v.#validateAll();
    return v;
  }

  #data: Record<string, unknown> = {};
  #errors: Record<string, string[]> = {};
  #validations;
  constructor(
    data: Record<string, unknown>,
    validations: Record<string, string>
  ) {
    this.#data = data;
    this.#validations = validations;
  }

  getErrors() {
    return Object.fromEntries(
      Object.entries(this.#errors).filter(([_, v]) => (v as string[]).length)
    );
  }

  fails() {
    return Object.values(this.#errors).some((arr) => arr.length > 0);
  }

  async #validateAll() {
    for (const [key, ruleStr] of Object.entries(this.#validations)) {
      this.#errors[key] = [];
      for (const rule of ruleStr.split("|")) {
        const [name, val] = rule.split(":");
        if (!this.#validRules.includes(name))
          throw new Error(`Validation rule ${name} is not supported.`);
        await this.#applyRule(key, name, val);
      }
    }
  }

  async #applyRule(key: string, name: string, val: unknown) {
    const v = this.#data[key];
    const e = this.#errors[key];

    switch (name) {
      case "required":
        if (!isset(v) || empty(v)) e.push("This field is required.");
        break;
      case "email":
        if (!(v as string)?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
          e.push("Invalid email format.");
        break;
      case "min":
        if (typeof v !== "string" || v.length < parseInt(val as string))
          e.push(`Minimum length is ${val}.`);
        break;
      case "max": {
        const max = parseInt(val as string);

        // String
        if (typeof v === "string") {
          if (v.length > max) {
            e.push(`Maximum length is ${max} characters.`);
          }

          // FormFile
        } else if (isObject(v) && v.content instanceof Uint8Array) {
          const sizeKB = v.content.length / 1024;
          if (sizeKB > max) {
            e.push(`Maximum file size is ${max} KB.`);
          }

          // Array of FormFiles (multiple uploads)
        } else if (
          isArray(v as FormFile[]) &&
          (v as FormFile[]).every((f) => f?.content instanceof Uint8Array)
        ) {
          for (const f of v as FormFile[]) {
            const sizeKB = f.content.length / 1024;
            if (sizeKB > max) {
              e.push(`Each file must be less than ${max} KB.`);
              break;
            }
          }

          // Fallback for unsupported types
        } else {
          e.push(`The field type is unsupported for max rule.`);
        }

        break;
      }

      case "unique": {
        const [table, column] = (val as string).split(",");
        // const exists = await DB.table(table).where(column, v).get();
        const exists = false;
        if (exists) e.push(`The ${key} must be unique.`);
        break;
      }
      case "confirmed":
        if (v !== this.#data[`${key}_confirmation`])
          e.push("Confirmation does not match.");
        break;
      case "regex": {
        const pattern = this.#regex[val as keyof IRegex];
        if (!pattern) e.push(`Regex ${val} is not defined.`);
        else if (!(v as string)?.match(new RegExp(pattern)))
          e.push(`Invalid format for ${key}.`);
        break;
      }
      case "file":
        {
          if ((v as FormFile[])[0]?.size === 0) {
            e.push("File is required.");
          }
        }
        break;
    }
  }
}

const GroupRoute = GR as typeof IEGroupRoute;

type KeysWithICallback<T> = {
  [P in keyof T]: T[P] extends ICallback ? P : unknown;
}[keyof T];

class MyRoute {
  private static routeId = 0;
  private static resourceId = 0;
  private static groupPreference: IReferencesRoute["groups"] = {};
  private static methodPreference: IReferencesRoute["methods"] = {};
  private static defaultRoute: IReferencesRoute["defaultRoute"] = {};

  public static group(config: IGroupParams, callback: () => void): void {
    if (!isObject(config)) {
      throw new Error("Group config must be an object");
    }
    const groupInstance = new GroupRoute();

    const keys = Object.keys(config) as (keyof IGroupParams)[];
    keys.forEach((key) => {
      if (methodExist(groupInstance, key) && isset(config[key])) {
        // deno-lint-ignore no-explicit-any
        groupInstance[key]((config as any)[key]);
      }
    });
    groupInstance.group(callback); // Call the group method
  }

  public static middleware(
    handler: string | (string | HttpMiddleware)[] | HttpMiddleware
  ) {
    const groupInstance = new GroupRoute();
    groupInstance.middleware(handler);
    return groupInstance;
  }

  public static prefix(uri: string) {
    const groupInstance = new GroupRoute();
    groupInstance.prefix(uri);
    return groupInstance;
  }
  public static domain(domain: string) {
    const groupInstance = new GroupRoute();
    groupInstance.domain(domain);
    return groupInstance;
  }
  public static where(obj: Record<string, RegExp[] | RegExp>) {
    const groupInstance = new GroupRoute();
    groupInstance.where(obj);
    return groupInstance;
  }

  public static whereNumber(key: string) {
    const groupInstance = new GroupRoute();
    groupInstance.whereNumber(key);
    return groupInstance;
  }
  public static whereAlpha(key: string) {
    const groupInstance = new GroupRoute();
    groupInstance.whereAlpha(key);
    return groupInstance;
  }
  public static whereAlphaNumeric(key: string) {
    const groupInstance = new GroupRoute();
    groupInstance.whereAlphaNumeric(key);
    return groupInstance;
  }

  public static as(name: string) {
    const groupInstance = new GroupRoute();
    groupInstance.as(name);
    return groupInstance;
  }

  public static pushGroupReference(id: number, groupInstance: IEGroupRoute) {
    if (empty(this.groupPreference[id])) {
      this.groupPreference[id] = groupInstance;
    }
  }

  // Public methods using the simplified registration
  public static get<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ) {
    return this.registerRoute(["get"], uri, arg);
  }

  public static post<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ) {
    return this.registerRoute(["post"], uri, arg);
  }

  public static put<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ) {
    return this.registerRoute(["put"], uri, arg);
  }

  public static delete<
    T extends BaseController,
    K extends KeysWithICallback<T>
  >(uri: string, arg: ICallback | [new () => T, K]) {
    return this.registerRoute(["delete"], uri, arg);
  }

  public static patch<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ) {
    return this.registerRoute(["patch"], uri, arg);
  }

  public static options<
    T extends BaseController,
    K extends KeysWithICallback<T>
  >(uri: string, arg: ICallback | [new () => T, K]) {
    return this.registerRoute(["options"], uri, arg);
  }

  public static head<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ) {
    return this.registerRoute(
      ["head"] as (keyof IHeaderChildRoutes)[],
      uri,
      arg
    );
  }

  public static any<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ) {
    return this.registerRoute(
      ["get", "post", "put", "delete", "patch", "options"],
      uri,
      arg
    );
  }

  public static match<T extends BaseController, K extends KeysWithICallback<T>>(
    methods: (keyof IChildRoutes)[],
    uri: string,
    arg: ICallback | [new () => T, K]
  ) {
    return this.registerRoute(methods, uri, arg);
  }

  public static view(
    uri: string,
    viewName: string,
    data: Record<string, unknown> = {}
  ): void {
    const method = ["get"] as (keyof IChildRoutes)[];
    const arg: ICallback = async () => view(viewName, data);
    this.registerRoute(method, uri, arg);
  }

  public static resource<
    T extends BaseController,
    K extends KeysWithICallback<T>
  >(uri: string, controller: new () => T) {
    if (!regexObj.alpha.test(uri))
      throw new Error(`${uri} should be an alpha character.`);
    const rsrcId = ++this.resourceId;
    const pluralized = plural(uri);
    const singularized = singular(pluralized);
    const baseUri = `/${pluralized}`;
    const thisRoutes: IResourceRouteConf["thisRoutes"] = {};
    const identifier: IResourceRouteConf["identifier"] = {
      index: 0,
      create: 0,
      post: 0,
      show: 0,
      edit: 0,
      update: 0,
      destroy: 0,
    };
    this.registerRoute(
      ["get"],
      baseUri,
      [controller, "index" as K],
      rsrcId
    ).name(`${pluralized}.index`);
    thisRoutes[this.routeId] = ["get"];
    identifier.index = this.routeId;
    this.registerRoute(
      ["get"],
      `${baseUri}/create`,
      [controller, "create" as K],
      rsrcId
    ).name(`${pluralized}.create`);
    thisRoutes[this.routeId] = ["get"];
    identifier.create = this.routeId;
    this.registerRoute(
      ["post"],
      `${baseUri}`,
      [controller, "store" as K],
      rsrcId
    ).name(`${pluralized}.post`);
    thisRoutes[this.routeId] = ["post"];
    identifier.post = this.routeId;
    this.registerRoute(
      ["get"],
      `${baseUri}/{${singularized}}`,
      [controller, "show" as K],
      rsrcId
    ).name(`${pluralized}.show`);
    thisRoutes[this.routeId] = ["get"];
    identifier.show = this.routeId;
    this.registerRoute(
      ["get"],
      `${baseUri}/{${singularized}}/edit`,
      [controller, "edit" as K],
      rsrcId
    ).name(`${pluralized}.edit`);
    thisRoutes[this.routeId] = ["get"];
    identifier.edit = this.routeId;
    this.registerRoute(
      ["put", "patch"],
      `${baseUri}/{${singularized}}`,
      [controller, "update" as K],
      rsrcId
    ).name(`${pluralized}.update`);
    thisRoutes[this.routeId] = ["put", "patch"];
    identifier.update = this.routeId;
    this.registerRoute(
      ["delete"],
      `${baseUri}/{${singularized}}`,
      [controller, "destroy" as K],
      rsrcId
    ).name(`${pluralized}.destroy`);
    thisRoutes[this.routeId] = ["delete"];
    identifier.destroy = this.routeId;

    this.resourceReferrence[rsrcId] = new ResourceRoute({
      thisRoutes,
      identifier,
      route: this as IRoute,
    });
    return this.resourceReferrence[rsrcId];
  }

  private static resourceReferrence: Record<string, ResourceRoute> = {};
  private static defaultResource: number[] = [];
  // Make `get` generic on controller T and method K
  private static registerRoute<
    T extends BaseController,
    K extends KeysWithICallback<T>
  >(
    method: (keyof IHeaderChildRoutes)[],
    uri: string,
    arg: ICallback | [new () => T, K],
    fromResource: null | number = null
  ): IMethodRoute {
    const id = ++MyRoute.routeId;
    const instancedRoute = new MethodRoute({ id, uri, method, arg });

    this.methodPreference[id] = instancedRoute;

    if (empty(GroupRoute.currGrp)) {
      if (!isNull(fromResource)) {
        if (this.defaultResource.indexOf(fromResource) == -1) {
          this.defaultResource.push(fromResource);
        }
      } else {
        this.defaultRoute[id] = method;
      }
    } else {
      const groupId = GroupRoute.gID;
      if (empty(this.groupPreference[groupId])) {
        this.groupPreference[groupId] = GroupRoute.getGroupName(groupId);
      }
      if (!isNull(fromResource)) {
        this.groupPreference[groupId].pushResource(fromResource);
      } else {
        this.groupPreference[groupId].pushChildren(method, id);
      }
    }

    return this.methodPreference[id];
  }
  public getAllGroupsAndMethods(): IReferencesRoute {
    const myData = {
      groups: MyRoute.groupPreference,
      methods: MyRoute.methodPreference,
      defaultRoute: MyRoute.defaultRoute,
      defaultResource: MyRoute.defaultResource,
      resourceReferrence: MyRoute.resourceReferrence,
    };

    // Reset the static properties after fetching
    MyRoute.groupPreference = {};
    MyRoute.methodPreference = {};
    MyRoute.defaultRoute = {};
    MyRoute.defaultResource = [];
    MyRoute.resourceReferrence = {};
    return myData;
  }

  public static getMethod(id: number): IMethodRoute | null {
    if (keyExist(this.methodPreference, String(id))) {
      return this.methodPreference[String(id)];
    }
    return null;
  }
}

export const Route: typeof IRoute = MyRoute;

// Auth and Guard Implementation

type GuardName = keyof typeof authConf.guards;
type GuardDriver<G extends GuardName> = (typeof authConf.guards)[G]["driver"];

type GuardInstance<G extends GuardName> = GuardDriver<G> extends "jwt"
  ? JwtGuard
  : GuardDriver<G> extends "session"
  ? SessionGuard
  : GuardDriver<G> extends "token"
  ? TokenGuard
  : never;

export class HonoAuth {
  private static defaultGuard: string = authConf?.default?.guard;

  #c: MyContext;
  #defaultGuard: string = HonoAuth.defaultGuard;
  constructor(c: MyContext) {
    if (empty(c) || !isObject(c)) {
      throw new Error("Context must be a valid object.");
    }
    this.#c = c;
  }

  public guard<G extends GuardName>(guardName: G = this.#defaultGuard as G) {
    const driver = authConf?.guards?.[guardName].driver;

    let guard;
    switch (driver) {
      case "jwt": {
        guard = JwtGuard;
        break;
      }
      case "session": {
        guard = SessionGuard;
        break;
      }
      case "token": {
        guard = TokenGuard;
        break;
      }
      default:
        throw new Error(`Unsupported guard driver: ${driver}`);
    }
    return new guard(this.#c, guardName as GuardName);
  }

  public setGuard<G extends GuardName>(guardName: G): void {
    if (!keyExist(authConf.guards, guardName)) {
      throw new Error(
        `Guard ${guardName} is not defined in auth configuration.`
      );
    }
    this.#defaultGuard = guardName;
  }

  public async attempt<G extends GuardName>(
    credentials: Record<string, unknown>,
    remember: boolean = false
  ): Promise<boolean | string> {
    return await this.guard<G>().attempt(credentials, remember);
  }

  public async check(): Promise<boolean> {
    return await this.guard().check();
  }
}
