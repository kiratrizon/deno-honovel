import {
  genSaltSync,
  hashSync,
  compareSync,
} from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { Blueprint, TableSchema } from "../../Database/Schema/index.ts";
import BaseController from "Illuminate/Routing/BaseController";
import { plural, singular } from "https://deno.land/x/deno_plural/mod.ts";
import authConf from "../../../../../../../config/auth.ts";
import {
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
import { FormFile } from "https://deno.land/x/multiparser@0.114.0/mod.ts";
import { SupportedDrivers } from "configs/@types/index.d.ts";
import { init } from "https://deno.land/x/base64@v0.2.1/base.ts";
import { AbstractStore, CacheManager } from "../../Cache/index.ts";
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
    callback: (blueprint: Blueprint) => void,
    db: SupportedDrivers
  ): Promise<void> {
    const blueprint = new Blueprint(table, db);
    callback(blueprint);
    if (blueprint.drops.length) {
      throw new Error(
        "Schema creation does not support dropping columns. Use dropColumn method instead."
      );
    }
    const converted = blueprint.toSql();
    await DB.connection(db).statement(converted);
  }

  public static async hasTable(
    table: string,
    db: SupportedDrivers
  ): Promise<boolean> {
    const dbType = db;
    let query = "";

    switch (dbType) {
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
        throw new Error(`Unsupported DB_CONNECTION: ${dbType}`);
    }

    const result = await DB.connection(db).select(query);

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

  public static async dropIfExists(
    table: string,
    db: SupportedDrivers
  ): Promise<void> {
    const dbType = db;

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

    await DB.connection(dbType).statement(sql);
  }

  public static async table(
    table: string,
    callback: (blueprint: Blueprint) => void,
    db: SupportedDrivers
  ): Promise<void> {
    const blueprint = new Blueprint(table, db);
    callback(blueprint);
    blueprint.alterMode();
    const converted = blueprint.toSql();
    await DB.connection(db).statement(converted);
  }
}

export class DB {
  public static connection(dbUsed: SupportedDrivers = "mysql"): DBConnection {
    return new DBConnection(dbUsed);
  }

  private static dbUsed: SupportedDrivers;

  public static init() {
    this.dbUsed = staticConfig("database").default;
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
}

class DBConnection {
  constructor(private dbUsed: SupportedDrivers) {
    if (!["mysql", "sqlite", "pgsql", "sqlsrv"].includes(dbUsed)) {
      throw new Error(`Unsupported database type: ${dbUsed}`);
    }
  }

  public table(table: sqlstring) {
    return new Builder({ table }, this.dbUsed);
  }

  public async statement(
    query: string,
    params: unknown[] = []
  ): Promise<boolean> {
    if (empty(query) || !isString(query)) {
      throw new Error("Query must be a non-empty string.");
    }
    const db = new Database(this.dbUsed);

    try {
      await db.runQuery(query, params);
      return true;
    } catch (error) {
      console.error("Database statement error:", error);
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
    const db = new Database(this.dbUsed);

    try {
      const result = await db.runQuery<"select">(query, params);
      return result;
    } catch (error) {
      console.error("Database select error:", error);
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
    const instance = new Builder({ table }, this.dbUsed);
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

    const db = new Database(this.dbUsed);
    const [sql, values] = db.insertOrUpdateBuilder({ table, data }, uniqueKeys);
    const result = await db.runQuery<"insert">(sql, values);
    return result;
  }

  public async reconnect(): Promise<void> {
    await Database.init(true);
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
        const [tableRef, column] = (val as string).split(",");

        if (!tableRef || !column) {
          throw new Error(
            `Invalid unique rule format: '${val}'. Expected 'table,column' or 'connection.table,column'.`
          );
        }

        const tryTable = tableRef.split(".");
        const dbUse = (
          tryTable.length === 2 ? tryTable[0] : staticConfig("database").default
        ) as SupportedDrivers;

        if (!isset(dbUse)) {
          throw new Error(
            `Database connection '${dbUse}' is not defined in config.`
          );
        }

        const table = tryTable.length === 2 ? tryTable[1] : tableRef;

        const exists = await DB.connection(dbUse)
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

// The main Cache facade class, similar to Laravel's Cache:: facade
export class Cache {
  /**
   * Retrieve or create the cache store instance for the given connection name.
   */
  static store(connection?: string): AbstractStore {
    if (!isset(connection)) {
      connection = this.defaultConnection; // use default if none provided
    }

    if (!keyExist(this.stores, connection)) {
      const cacheConfig = staticConfig("cache");

      // Validate cache config presence
      if (!isset(cacheConfig) || !isset(cacheConfig.stores)) {
        throw new Error("Cache configuration is not defined.");
      }

      // Validate store config
      if (!keyExist(cacheConfig.stores, connection)) {
        throw new Error(`Cache store ${connection} is not defined.`);
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
    const cacheConfig = staticConfig("cache");

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
    return await this.store(this.defaultConnection).get(key);
  }

  /**
   * Store a value in the cache for a given number of seconds.
   */
  static async put(key: string, value: any, seconds: number) {
    await this.store(this.defaultConnection).put(key, value, seconds);
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
    await this.store(this.defaultConnection).forever(key, value);
  }

  /**
   * Determine if an item exists in the cache.
   */
  static async has(key: string) {
    return await this.store(this.defaultConnection).has(key);
  }

  /**
   * Increment a cached numeric value.
   */
  static async increment(key: string, value: number = 1) {
    return await this.store(this.defaultConnection).increment(key, value);
  }

  /**
   * Decrement a cached numeric value.
   */
  static async decrement(key: string, value: number = 1) {
    return await this.store(this.defaultConnection).decrement(key, value);
  }

  /**
   * Get a cached value or return the default if missing.
   */
  static async getOrDefault<T = any>(key: string, defaultValue: T): Promise<T> {
    return await this.store(this.defaultConnection).getOrDefault(
      key,
      defaultValue
    );
  }
}
