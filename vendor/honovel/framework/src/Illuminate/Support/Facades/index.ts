import { genSaltSync, hashSync, compareSync } from "bcrypt";
import { Blueprint, TableSchema } from "../../Database/Schema/index.ts";
import BaseController from "Illuminate/Routing/BaseController";
import pluralize from "pluralize";
import {
  Authenticatable,
  BaseGuard,
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
import { Builder, SQLRaw, sqlstring } from "../../Database/Query/index.ts";
import { FormFile } from "multiParser2";
import {
  AuthConfig,
  DatabaseConfig,
  SupportedDrivers,
} from "configs/@types/index.d.ts";
import {
  AbstractStore,
  CacheManager,
  CacheStoreData,
} from "../../Cache/index.ts";
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
  private static validateDB(db: SupportedDrivers): void {
    const supportedSchemaDrivers = ["mysql", "pgsql", "sqlite", "sqlsrv"];
    if (!supportedSchemaDrivers.includes(db)) {
      throw new Error(
        `Unsupported database type for schema operations: ${db}. Supported types are: ${supportedSchemaDrivers.join(
          ", "
        )}.`
      );
    }
  }
  public static async create(
    table: string,
    callback: (blueprint: Blueprint) => void,
    connection?: string
  ): Promise<void> {
    const driver = DB.connection(connection).getDriverName();
    this.validateDB(driver);
    const blueprint = new Blueprint(table, driver);
    callback(blueprint);
    if (blueprint.drops.length) {
      throw new Error(
        "Schema creation does not support dropping columns. Use dropColumn method instead."
      );
    }
    const converted = blueprint.toSql();
    await DB.connection(connection).statement(converted);
  }

  public static async hasTable(
    table: string,
    connection?: string
  ): Promise<boolean> {
    const driver = DB.connection(connection).getDriverName();
    this.validateDB(driver);
    let query = "";

    switch (driver) {
      case "mysql":
        query = `SHOW TABLES LIKE '${table}'`;
        break;
      case "sqlite":
        query = `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`;
        break;
      case "pgsql":
        query = `SELECT to_regclass('${table}')`;
        break;
      case "sqlsrv":
        query = `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${table}'`;
        break;
      default:
        throw new Error(`Unsupported driver: ${driver}`);
    }

    const result = await DB.connection(connection).select(query);

    if (!result || result.length === 0) {
      return false;
    }

    // Special handling for PostgreSQL because to_regclass can return null
    if (
      driver.includes("pgsql") &&
      (!result[0] || Object.values(result[0])[0] === null)
    ) {
      return false;
    }

    return true;
  }

  public static async dropIfExists(
    table: string,
    connection?: string
  ): Promise<void> {
    const driver = DB.connection(connection).getDriverName();
    this.validateDB(driver);

    let sql: string;

    switch (driver) {
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
        throw new Error(`Unsupported driver type: ${driver}`);
    }

    await DB.connection(connection).statement(sql);
  }

  public static async table(
    table: string,
    callback: (blueprint: Blueprint) => void,
    connection?: string
  ): Promise<void> {
    const driver = DB.connection(connection).getDriverName();
    this.validateDB(driver);
    const blueprint = new Blueprint(table, driver);
    callback(blueprint);
    blueprint.alterMode();
    const converted = blueprint.toSql();
    await DB.connection(connection).statement(converted);
  }
}

export class DB {
  public static hasConnection(connection: string): boolean {
    const connections = config("database").connections;
    return keyExist(connections, connection);
  }
  public static getDefaultConnection(): string {
    return config("database").default;
  }
  public static connection(dbUsed?: string): DBConnection {
    if (!isset(dbUsed)) {
      dbUsed = config("database").default;
    }
    return new DBConnection(dbUsed);
  }

  private static dbUsed: string;

  private static dbConfig: DatabaseConfig;
  public static init() {
    const db = config("database");
    this.dbUsed = db.default;
    this.dbConfig = db;
  }

  public static table(table: sqlstring) {
    return new DBConnection(this.dbUsed).table(table);
  }

  public static async statement(
    query: string,
    params: unknown[] = []
  ): Promise<boolean> {
    return await new DBConnection(this.dbUsed).statement(query, params);
  }

  public static async select(
    query: string,
    params: unknown[] = []
  ): Promise<QueryResultDerived["select"]> {
    return await new DBConnection(this.dbUsed).select(query, params);
  }

  public static async insert(
    table: string,
    ...data: Record<string, unknown>[]
  ): Promise<QueryResultDerived["insert"]> {
    return await new DBConnection(this.dbUsed).insert(table, ...data);
  }

  public static async insertOrUpdate(
    table: string,
    data: Record<string, unknown>,
    uniqueKeys: string[] = []
  ) {
    return await new DBConnection(this.dbUsed).insertOrUpdate(
      table,
      data,
      uniqueKeys
    );
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

  public static getDriverName(): SupportedDrivers {
    const driver = this.dbConfig.connections[this.dbUsed].driver;
    return driver as SupportedDrivers;
  }
}

class DBConnection {
  private readonly dbConfig: DatabaseConfig;
  constructor(private readonly connection: string) {
    this.dbConfig = config("database");
    const dbUsed = this.dbConfig.connections[this.connection]
      .driver as SupportedDrivers;
    if (!["mysql", "sqlite", "pgsql", "sqlsrv"].includes(dbUsed)) {
      throw new Error(`Unsupported database type: ${dbUsed}`);
    }
  }

  public table(table: sqlstring) {
    return new Builder({ table }, this.connection);
  }

  public async statement(
    query: string,
    params: unknown[] = []
  ): Promise<boolean> {
    if (empty(query) || !isString(query)) {
      throw new Error("Query must be a non-empty string.");
    }
    const db = new Database(this.connection);

    try {
      await db.runQuery(query, params);
      return true;
    } catch (error) {
      consoledeno.error("Database statement error:", error);
      throw error;
    }
  }

  public async select(
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
    const db = new Database(this.connection);

    try {
      const result = await db.runQuery<"select">(query, params);
      return result;
    } catch (error) {
      consoledeno.error("Database select error:", error);
      throw error;
    }
  }

  public async insert(
    table: string,
    ...data: Record<string, unknown>[]
  ): Promise<QueryResultDerived["insert"]> {
    if (empty(table) || !isString(table)) {
      throw new Error("Table name must be a non-empty string.");
    }
    const instance = new Builder({ table }, this.connection);
    return await instance.insert(...data);
  }

  public async insertOrUpdate(
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

    const db = new Database(this.connection);
    const [sql, values] = db.insertOrUpdateBuilder({ table, data }, uniqueKeys);
    const result = await db.runQuery<"insert">(sql, values);
    return result;
  }

  public async update(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>
  ): Promise<QueryResultDerived["update"]> {
    if (empty(table) || !isString(table)) {
      throw new Error("Table name must be a non-empty string.");
    }
    if (empty(data) || !isObject(data)) {
      throw new Error("Data must be a non-empty objects.");
    }

    const db = new Database(this.connection);
    const [sql, values] = db.updateBuilder(table, data, where);
    const result = await db.runQuery<"update">(sql, values);
    return result;
  }

  public async reconnect(): Promise<void> {
    await Database.init(true);
  }

  public getDriverName(): SupportedDrivers {
    const driver = this.dbConfig.connections[this.connection].driver;
    return driver as SupportedDrivers;
  }
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
    "array", // ✅ new
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
    const v = new this(data, validations);
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
        const [tableRef, column] = (val as string).split(",");

        if (!tableRef || !column) {
          throw new Error(
            `Invalid unique rule format: '${val}'. Expected 'table,column' or 'connection.table,column'.`
          );
        }

        const tryTable = tableRef.split(".");
        const connection = (
          tryTable.length === 2 ? tryTable[0] : config("database").default
        ) as string;

        if (!isset(connection)) {
          throw new Error(
            `Database connection '${connection}' is not defined in config.`
          );
        }

        const table = tryTable.length === 2 ? tryTable[1] : tableRef;

        if (!isset(v) || empty(v)) {
          e.push(`The ${key} is required for unique validation.`);
          break;
        }
        const exists = await DB.connection(connection)
          .table(table)
          .where(column, v)
          .first(); // Faster and more precise

        if (exists) {
          e.push(`The ${key} must be unique.`);
        }
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
      case "array": {
        if (!Array.isArray(v)) e.push("This field must be an array.");
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

import HttpHono from "../../../hono/Http/HttpHono.ts";
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
  public static where(param: string, regex: RegExp) {
    const groupInstance = new GroupRoute();
    groupInstance.where(param, regex);
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
    K extends KeysWithICallback<T>,
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
    K extends KeysWithICallback<T>,
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
    K extends KeysWithICallback<T>,
  >(uri: string, controller: new () => T) {
    if (!regexObj.alpha.test(uri))
      throw new Error(`${uri} should be an alpha character.`);
    const rsrcId = ++this.resourceId;
    const pluralized = pluralize.plural(uri);
    const singularized = pluralize.singular(pluralized);
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
    K extends KeysWithICallback<T>,
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

  private static fallbackFn: ((param: HttpHono) => Promise<void>) | null = null;
  public static fallback(fn: (param: HttpHono) => Promise<void>): void {
    if (!this.fallbackFn && isFunction(fn) && empty(this.groupPreference)) {
      this.fallbackFn = fn;
    }
  }
}

export const Route: typeof IRoute = MyRoute;

// Auth and Guard Implementation

type GuardName = keyof AuthConfig["guards"];
type GuardDriver<G extends GuardName> = AuthConfig["guards"][G]["driver"];

type GuardInstance<G extends GuardName> =
  GuardDriver<G> extends "jwt"
    ? JwtGuard
    : GuardDriver<G> extends "session"
      ? SessionGuard
      : GuardDriver<G> extends "token"
        ? TokenGuard
        : never;

export class Auth {
  private static defaultGuard: string;

  static authConf: AuthConfig;
  #c: MyContext;
  #defaultGuard: string = Auth.defaultGuard;
  constructor(c: MyContext) {
    if (empty(c) || !isObject(c)) {
      throw new Error("Context must be a valid object.");
    }
    this.#c = c;
  }

  public static setAuth() {
    this.authConf = config("auth");
    this.defaultGuard = this.authConf?.default?.guard || "web";
  }

  private _guards: Record<string, BaseGuard> = {};

  public guard<G extends GuardName>(guardName?: G): BaseGuard {
    if (!isset(guardName)) {
      guardName = this.#defaultGuard as G;
    }
    if (keyExist(this._guards, guardName)) {
      return this._guards[guardName] as GuardInstance<G>;
    }
    const driver = Auth.authConf?.guards?.[guardName].driver;

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
    this._guards[guardName] = new guard(this.#c, guardName as GuardName);
    return this._guards[guardName] as GuardInstance<G>;
  }

  public setGuard<G extends GuardName>(guardName: G): void {
    if (!keyExist(Auth.authConf.guards, guardName)) {
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

  public user() {
    return this.guard().user();
  }
}

// The main Cache facade class, similar to Laravel's Cache:: facade
export class Cache {
  /**
   * Retrieve or create the cache store instance for the given connection name.
   */
  static store(connection?: nullify | string): AbstractStore {
    if (!isset(connection)) {
      connection = this.defaultConnection; // use default if none provided
    }

    if (!keyExist(this.stores, connection)) {
      const cacheConfig = config("cache");

      // Validate cache config presence
      if (!isset(cacheConfig) || !isset(cacheConfig.stores)) {
        throw new Error("Cache configuration is not defined.");
      }

      // Validate store config
      if (!keyExist(cacheConfig.stores, connection)) {
        throw new Error(`Cache store "${connection}" is not defined.`);
      }

      const storeConfig = cacheConfig.stores[connection];

      // Validate driver definition
      if (!isset(storeConfig.driver)) {
        throw new Error(`Cache store ${connection} driver is not defined.`);
      }

      const driver = storeConfig.driver;
      const remainingConfig = { ...storeConfig };

      // Create and register the store instance
      const instanceCache = new CacheManager(driver, remainingConfig);
      this.stores[connection] = instanceCache.getStore();
    }

    // Return cached store instance
    return this.stores[connection];
  }

  // Cache store instances (e.g. redis, memory, file)
  private static stores: Record<string, AbstractStore> = {};

  // The default cache store name (set in config)
  private static defaultConnection: string;

  /**
   * Initialize the cache system by loading the default connection from config.
   */
  static init() {
    const cacheConfig = config("cache");

    if (empty(cacheConfig)) {
      throw new Error("Cache configuration is not defined.");
    }

    if (!isset(cacheConfig.default)) {
      throw new Error("Default cache connection is not defined.");
    }

    this.defaultConnection = cacheConfig.default;
  }

  /**
   * Get a cached value by key.
   */
  static async get(key: string) {
    return await this.store(this.defaultConnection).get(
      key as keyof CacheStoreData
    );
  }

  /**
   * Store a value in the cache for a given number of seconds.
   */
  static async put(key: string, value: any, seconds: number) {
    await this.store(this.defaultConnection).put(
      key as keyof CacheStoreData,
      value,
      seconds
    );
  }

  /**
   * Remove an item from the cache.
   */
  static async forget(key: string) {
    await this.store(this.defaultConnection).forget(key);
  }

  /**
   * Clear all items from the cache.
   */
  static async flush() {
    await this.store(this.defaultConnection).flush();
  }

  /**
   * Store an item in the cache indefinitely.
   */
  static async forever(key: string, value: any) {
    await this.store(this.defaultConnection).forever(
      key as keyof CacheStoreData,
      value
    );
  }

  /**
   * Determine if an item exists in the cache.
   */
  static async has(key: string) {
    return await this.store(this.defaultConnection).has(
      key as keyof CacheStoreData
    );
  }

  /**
   * Increment a cached numeric value.
   */
  static async increment(key: string, value: number = 1) {
    return await this.store(this.defaultConnection).increment(
      key as keyof CacheStoreData,
      value
    );
  }

  /**
   * Decrement a cached numeric value.
   */
  static async decrement(key: string, value: number = 1) {
    return await this.store(this.defaultConnection).decrement(
      key as keyof CacheStoreData,
      value
    );
  }

  /**
   * Get a cached value or return the default if missing.
   */
  static async getOrDefault<T = any>(key: string, defaultValue: T): Promise<T> {
    return await this.store(this.defaultConnection).getOrDefault(
      key as keyof CacheStoreData,
      defaultValue
    );
  }

  static extend(key: string, fn: () => AbstractStore) {
    if (empty(key) || !isString(key)) {
      throw new Error("Cache store key must be a non-empty string.");
    }
    if (!isFunction(fn)) {
      throw new Error("Cache store extension must be a function.");
    }
    if (keyExist(this.stores, key)) {
      return;
    }
    this.stores[key] = fn();
  }
}

type AbilityCallback = (
  user: Authenticatable,
  ...args: (string | null)[]
) => boolean | Promise<boolean>;

/**
 * A class to handle authorization gates.
 */
export class Gate {
  private static abilities: Map<string, AbilityCallback> = new Map();

  /**
   * Define a new ability.
   */
  public static define(name: string, callback: AbilityCallback): void {
    this.abilities.set(name, callback);
  }

  /**
   * Check if the user has a given ability.
   */
  public static async allows(
    ability: string,
    user: Authenticatable,
    ...args: (string | null)[]
  ): Promise<boolean> {
    const callback = this.abilities.get(ability);
    if (!callback || !isFunction(callback)) {
      throw new Error(`Ability "${ability}" is not defined.`);
    }

    return await callback(user, ...args);
  }

  /**
   * Deny check (inverse of allows).
   */
  public static async denies(
    ability: string,
    user: Authenticatable,
    ...args: (string | null)[]
  ): Promise<boolean> {
    return !(await this.allows(ability, user, ...args));
  }

  /**
   * Throw error if the ability is not granted.
   */
  public static async authorize(
    ability: string,
    user: Authenticatable,
    ...args: (string | null)[]
  ): Promise<void> {
    const allowed = await this.allows(ability, user, ...args);
    if (!allowed) {
      abort(401, `This action is unauthorized: "${ability}"`);
    }
  }
}

import { hmac } from "hmac";
import { sha256 } from "sha2";

export class URL {
  private static signed(
    path: string,
    params: Record<string, string | number> = {},
    expires?: number
  ): string {
    const app = config("app");
    const secret = app.key;
    const url = new globalThis.URL(path, app.url || "http://localhost");

    // add user params
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }

    // add expiration timestamp if requested
    if (expires) {
      url.searchParams.set(
        "expires",
        String(Math.floor(Date.now() / 1000) + expires)
      );
    }

    // unsigned string: path + query (without signature)
    const unsignedUrl =
      url.pathname + (url.search ? `?${url.searchParams}` : "");

    // sign with HMAC-SHA256
    const key = new TextEncoder().encode(secret);
    const msg = new TextEncoder().encode(unsignedUrl);
    const signatureBytes = hmac(sha256, key, msg);
    const signature = this.toHex(signatureBytes);

    url.searchParams.set("signature", signature);

    return url.toString();
  }

  private static toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  public static signedRoute(
    path: string,
    params: Record<string, unknown>
  ): string {
    return this.signed(path, params as Record<string, string | number>);
  }

  public static temporarySignedRoute(
    path: string,
    params: Record<string, string | number> = {},
    expiresIn: number
  ): string {
    return this.signed(path, params, expiresIn);
  }

  public static verify(requestUrl: string): boolean {
    const app = config("app");
    const keys = [app.key, ...(app.previous_keys ?? [])];
    const url = new globalThis.URL(requestUrl, app.url || "http://localhost");

    const signature = url.searchParams.get("signature");
    if (!signature) return false;

    // expiration check
    const expires = url.searchParams.get("expires");
    if (expires && parseInt(expires) < Math.floor(time() / 1000)) {
      return false;
    }

    // remove signature before recomputing
    url.searchParams.delete("signature");
    const unsignedUrl =
      url.pathname + (url.search ? `?${url.searchParams}` : "");

    const msg = new TextEncoder().encode(unsignedUrl);

    // try verifying against all keys
    for (const key of keys) {
      const keyBytes = new TextEncoder().encode(key);
      const expected = this.toHex(hmac(sha256, keyBytes, msg));
      if (signature === expected) {
        return true; // ✅ valid with this key
      }
    }

    return false; // ❌ no keys matched
  }
}
