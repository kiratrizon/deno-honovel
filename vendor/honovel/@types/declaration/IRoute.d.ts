import BaseController from "Illuminate/Routing/BaseController";

export interface IGroupParams {
  prefix?: string;
  middleware?: string | HttpMiddleware | (string | HttpMiddleware)[];
  as?: string;
  domain?: string;
}

export interface IChildRoutes {
  get: number[];
  post: number[];
  options: number[];
  put: number[];
  delete: number[];
  patch: number[];
}

export interface IHeaderChildRoutes extends IChildRoutes {
  head: number[];
}

export type ICallback = (httpObj: HttpHono, ...args: any[]) => Promise<unknown>;

type KeysWithICallback<T> = {
  [P in keyof T]: T[P] extends ICallback ? P : never;
}[keyof T];

/**
 * IGroupRoute provides static methods to define and configure route groups.
 * Route groups allow you to apply common settings such as middleware, prefixes,
 * domains, naming aliases, and parameter constraints to multiple routes at once.
 */
export declare class IGroupRoute {
  /**
   * Apply middleware or an array of middleware to the route group.
   * Middleware can be strings (middleware names) or handler functions.
   *
   * @param handler - A middleware string, array of middleware strings/functions, or a middleware function.
   * @returns The result of the middleware method from the IGroupInstance.
   */
  public static middleware(
    handler: string | (string | HttpMiddleware)[] | HttpMiddleware
  ): ReturnType<InstanceType<typeof IGroupInstance>["middleware"]>;

  /**
   * Set a URI prefix for all routes within this group.
   *
   * @param uri - The URI prefix string (e.g., "/api/v1").
   * @returns The result of the prefix method from the IGroupInstance.
   */
  public static prefix(
    uri: string
  ): ReturnType<InstanceType<typeof IGroupInstance>["prefix"]>;

  /**
   * Restrict the route group to a specific domain.
   *
   * @param domain - The domain name (e.g., "example.com").
   * @returns The result of the domain method from the IGroupInstance.
   */
  public static domain(
    domain: string
  ): ReturnType<InstanceType<typeof IGroupInstance>["domain"]>;

  /**
   * Assign an alias name to the route group.
   * Alias names are used as prefixes for route naming.
   *
   * @param name - The alias name string.
   * @returns The result of the as method from the IGroupInstance.
   */
  public static as(
    name: string
  ): ReturnType<InstanceType<typeof IGroupInstance>["as"]>; // alias for name()

  /**
   * Define parameter constraints using regular expressions.
   *
   * @param obj - An object mapping parameter names to regex pattern strings.
   * @returns The result of the where method from the IGroupInstance.
   */
  public static where(
    param: string,
    regex: RegExp
  ): ReturnType<InstanceType<typeof IGroupInstance>["where"]>;

  /**
   * Define a constraint for a route parameter that only allows numeric values.
   *
   * @param key - The parameter name.
   * @returns The result of the whereNumber method from the IGroupInstance.
   */
  public static whereNumber(
    key: string
  ): ReturnType<InstanceType<typeof IGroupInstance>["whereNumber"]>;

  /**
   * Define a constraint for a route parameter that only allows alphabetic characters.
   *
   * @param key - The parameter name.
   * @returns The result of the whereAlpha method from the IGroupInstance.
   */
  public static whereAlpha(
    key: string
  ): ReturnType<InstanceType<typeof IGroupInstance>["whereAlpha"]>;

  /**
   * Define a constraint for a route parameter that only allows alphanumeric characters.
   *
   * @param key - The parameter name.
   * @returns The result of the whereAlphaNumeric method from the IGroupInstance.
   */
  public static whereAlphaNumeric(
    key: string
  ): ReturnType<InstanceType<typeof IGroupInstance>["whereAlphaNumeric"]>;

  /**
   * Create a route group with specified parameters and a callback.
   * The callback should contain route definitions to which the group parameters will apply.
   *
   * @param param - An object containing group parameters such as prefix, middleware, domain, etc.
   * @param callback - A function containing the route definitions within this group.
   */
  public static group(param: IGroupParams, callback: () => void): void;
}

export declare class IGroupInstance {
  /**
   * Apply middleware or an array of middleware to the route group.
   * Middleware can be strings (middleware names) or handler functions.
   * @param handler - A middleware string, array of middleware strings/functions, or a middleware function.
   * @returns The current instance of IGroupInstance for method chaining.
   */
  public middleware(
    handler: string | (string | HttpMiddleware)[] | HttpMiddleware
  ): this;
  /**
   * Set a URI prefix for all routes within this group.
   * @param uri - The URI prefix string (e.g., "/api/v1").
   * @returns The current instance of IGroupInstance for method chaining.
   */
  public prefix(uri: string): this;
  /**
   * Restrict the route group to a specific domain.
   *
   * @param domain - The domain name (e.g., "example.com").
   * @returns The current instance of IGroupInstance for method chaining.
   * @throws Error if the domain contains a question mark (indicating optionality).
   */
  public domain(domain: string): this;
  /**
   * Assign an alias name to the route group.
   * Alias names are used as prefixes for route naming.
   * @param name - The alias name string.
   * @returns The current instance of IGroupInstance for method chaining.
   */
  public as(name: string): this;
  /**
   * Define parameter constraints using regular expressions.
   * @param ojb - An object mapping parameter names to regex pattern strings.
   * @returns The current instance of IGroupInstance for method chaining.
   */
  public where(param: string, regex: RegExp): this;
  /**
   * Define a constraint for a route parameter that only allows numeric values.
   * @param key - The parameter name.
   * @returns The current instance of IGroupInstance for method chaining.
   */
  public whereNumber(key: string): this;
  /**
   * Define a constraint for a route parameter that only allows alphabetic characters.
   * @param key - The parameter name.
   * @returns The current instance of IGroupInstance for method chaining.
   */
  public whereAlpha(key: string): this;
  /**
   * Define a constraint for a route parameter that only allows alphanumeric characters.
   * @param key - The parameter name.
   * @returns The current instance of IGroupInstance for method chaining.
   */
  public whereAlphaNumeric(key: string): this;
  /**
   * Create a route group with specified parameters and a callback.
   * The callback should contain route definitions to which the group parameters will apply.
   * @param callback - A function containing the route definitions within this group.
   */
  public group(callback: (() => void) | string): void;
}

interface FlagConfig {
  middleware?: (string | HttpMiddleware)[];
  where?: Record<string, RegExp[]>;
}

interface IGFlagConfig extends FlagConfig {
  domain?: string;
  as?: string;
  name?: string;
}
export interface IMFlagConfig extends FlagConfig {
  name?: string;
}
export declare class IEGroupRoute extends IGroupInstance {
  public static get currGrp(): string[];
  public static get gID(): number;
  public static getGroupName(id: number): IEGroupRoute;
  public pushChildren(method: (keyof IHeaderChildRoutes)[], id: number): void;
  public pushResource(resourceId: number): void;
  public get children(): IHeaderChildRoutes;
  public get name(): string;
  public get flagConfig(): IGFlagConfig;
  public get myRoutes(): Record<string, (keyof IHeaderChildRoutes)[]>;
}

export interface IMethodRoute {
  /**
   * Assign an alias name to the route.
   * Alias names are used as prefixes for route naming.
   * @param name - The alias name string.
   * @returns The current instance of IMethodRoute for method chaining.
   */
  name(name: string): this;
  /**
   * Apply middleware or an array of middleware to the route.
   * Middleware can be strings (middleware names) or handler functions.
   * @param handler - A middleware string, array of middleware strings/functions, or a middleware function.
   * @returns The current instance of IMethodRoute for method chaining.
   */
  middleware(
    handler: string | (string | HttpMiddleware)[] | HttpMiddleware
  ): this;
  /**
   * Define parameter constraints using regular expressions.
   * @param ojb - An object mapping parameter names to regex pattern strings.
   * @returns The current instance of IMethodRoute for method chaining.
   */
  where(param: string, regex: RegExp): this;
  /**
   * Define a constraint for a route parameter that only allows numeric characters.
   * @param key - The parameter name.
   * @returns The current instance of IMethodRoute.
   */
  whereNumber(key: string): this;
  /**
   * Define a constraint for a route parameter that only allows alpha characters.
   * @param key - The parameter name.
   * @returns The current instance of IMethodRoute.
   */
  whereAlpha(key: string): this;
  /**
   * Define a constraint for a route parameter that only allows alphanumeric characters.
   * @param key - The parameter name.
   * @returns The current instance of IMethodRoute.
   */
  whereAlphaNumeric(key: string): this;
}

/**
 * IRoute provides an interface for defining HTTP routes,
 * allowing controller-based or direct callback routing.
 */
export declare class IRoute extends IGroupRoute {
  /**
   * Register a GET route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  public static get<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;

  /**
   * Register a POST route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  public static post<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;

  /**
   * Register a PUT route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  public static put<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;

  /**
   * Register a DELETE route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  public static delete<
    T extends BaseController,
    K extends KeysWithICallback<T>
  >(uri: string, arg: ICallback | [new () => T, K]): IMethodRoute;

  /**
   * Register a PATCH route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  public static patch<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;

  /**
   * Register an OPTIONS route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  public static options<
    T extends BaseController,
    K extends KeysWithICallback<T>
  >(uri: string, arg: ICallback | [new () => T, K]): IMethodRoute;

  /**
   * Register a HEAD route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  public static head<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;

  /**
   * Register a route that responds to any HTTP method.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  public static any<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;

  /**
   * Register a route for multiple specified HTTP methods.
   * @param methods - An array of HTTP methods (e.g., ['GET', 'POST']).
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  public static match<T extends BaseController, K extends KeysWithICallback<T>>(
    methods: (keyof IChildRoutes)[],
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute;

  /**
   * Define a route that redirects to another URI.
   * @param uri - The source URI.
   * @param destination - The destination URI.
   * @param status - Optional HTTP status code (default is 302).
   */
  // public static redirect(
  //   uri: string,
  //   destination: string,
  //   status?: number
  // ): void;

  /**
   * Register a route that renders a view template.
   * @param uri - The URI pattern.
   * @param view - The name of the view to render.
   * @param data - Optional data to pass to the view.
   */
  public static view(
    uri: string,
    view: string,
    data?: Record<string, unknown>
  ): void;

  /**
   * Register a resource route.
   * @param uri - The URI pattern for the resource route. It is automatically pluralized.
   * @param controller - The controller class to handle the resource.
   */
  public static resource<T extends BaseController>(
    uri: string,
    controller: new () => T
  ): IResourceRoute;
}

export type IdefaultRoute = Record<string, (keyof IHeaderChildRoutes)[]>;

export declare class IERoute extends IRoute {
  public static pushGroupReference(
    id: number,
    groupInstance: IGroupInstance
  ): void;
}

import MethodRoute from "../../framework/src/hono/Support/MethodRoute.ts";
import ResourceRoute, {
  ResourceKeys,
} from "../../framework/src/hono/Support/ResourceRoute.ts";
import HttpHono from "HttpHono";
export interface IReferencesRoute {
  groups: Record<string, IEGroupRoute>;
  methods: Record<string, InstanceType<typeof MethodRoute>>;
  defaultRoute: IdefaultRoute;
  defaultResource: number[];
  resourceReferrence: Record<string, ResourceRoute>;
}

export declare class INRoute extends IRoute {
  getAllGroupsAndMethods(): IReferencesRoute;
}

export declare class IResourceRoute {
  /**
   * Define parameter constraints using regular expressions.
   * @param ojb - An object mapping parameter names to regex pattern strings.
   * @returns The current instance of IResourceRoute for method chaining.
   */
  public where(param: string, regex: RegExp): this;
  /**
   * Define a constraint for a route parameter that only allows numeric values.
   * @param key - The parameter name.
   * @returns The current instance of IResourceRoute for method chaining.
   */
  public whereNumber(key: string): this;
  /**
   * Define a constraint for a route parameter that only allows alphabetic characters.
   * @param key - The parameter name.
   * @returns The current instance of IResourceRoute for method chaining.
   */
  public whereAlpha(key: string): this;
  /**
   * Define a constraint for a route parameter that only allows alphanumeric characters.
   * @param key - The parameter name.
   * @returns The current instance of IResourceRoute for method chaining.
   */
  public whereAlphaNumeric(key: string): this;

  /**
   * Exclude specific resource keys from the route.
   * @param arr - An array of resource keys to exclude.
   */
  public except(arr: ResourceKeys[]): this;

  /**
   * Include specific resource keys in the route.
   * @param arr - An array of resource keys to include.
   */
  public only(arr: ResourceKeys[]): this;
}
