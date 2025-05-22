import BaseController from "../../Base/BaseController.ts";

export interface IGroupParams {
  prefix?: string;
  middleware?:
    | string
    | (() => Promise<unknown>)
    | (string | (() => Promise<unknown>))[];
  as?: string;
  domain?: string;
}

export interface IChildRoutes {
  get: number[];
  post: number[];
  options: number[];
  put: number[];
  delete: number[];
  head: number[];
  patch: number[];
  all: number[];
}

export type ICallback = (
  httpObj: HttpHono,
  ...args: unknown[]
) => Promise<unknown>;

type KeysWithICallback<T> = {
  [P in keyof T]: T[P] extends ICallback ? P : never;
}[keyof T];

export declare class IGroupRoute {
  public static middleware(
    handler: string | string[] | (() => Promise<unknown>)
  ): ReturnType<InstanceType<typeof IGroupInstance>["middleware"]>;
  public static prefix(
    uri: string
  ): ReturnType<InstanceType<typeof IGroupInstance>["prefix"]>;
  public static domain(
    domain: string
  ): ReturnType<InstanceType<typeof IGroupInstance>["domain"]>;
  public static as(
    name: string
  ): ReturnType<InstanceType<typeof IGroupInstance>["as"]>; // alias for name()
  // public static where(
  //   key: string,
  //   regex: string
  // ): ReturnType<InstanceType<typeof IGroupInstance>["where"]>;
  // public static whereNumber(
  //   key: string
  // ): ReturnType<InstanceType<typeof IGroupInstance>["whereNumber"]>;
  // public static whereAlpha(
  //   key: string
  // ): ReturnType<InstanceType<typeof IGroupInstance>["whereAlpha"]>;
  // public static whereAlphaNumeric(
  //   key: string
  // ): ReturnType<InstanceType<typeof IGroupInstance>["whereAlphaNumeric"]>;
  public static group(param: IGroupParams, callback: () => void): void;
}

export declare class IGroupInstance {
  public middleware(
    handler: string | string[] | (() => Promise<unknown>)
  ): this;
  public prefix(uri: string): this;
  public domain(domain: string): this;
  public as(name: string): this; // alias for name()
  // public where(key: string, regex: string): this;
  // public whereNumber(key: string): this;
  // public whereAlpha(key: string): this;
  // public whereAlphaNumeric(key: string): this;
  public group(callback: () => void): void;
}

export declare class IEGroupRoute extends IGroupInstance {
  public static get currGrp(): string[];
  public static get gID(): number;
  public static getGroupName(id: number): IEGroupRoute;
  pushChilds(method: keyof IChildRoutes, id: number): void;
}

export interface IMethodRoute {
  name(name: string): this;
  middleware(handler: string | string[] | (() => Promise<unknown>)): this;
  where(key: string, regex: string): this;
  whereNumber(key: string): this;
  whereAlpha(key: string): this;
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
  // public static post<T extends BaseController, K extends KeysWithICallback<T>>(
  //   uri: string,
  //   arg: ICallback | [new () => T, K]
  // ): IMethodRoute;

  /**
   * Register a PUT route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  // public static put<T extends BaseController, K extends KeysWithICallback<T>>(
  //   uri: string,
  //   arg: ICallback | [new () => T, K]
  // ): IMethodRoute;

  /**
   * Register a DELETE route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  // public static delete<
  //   T extends BaseController,
  //   K extends KeysWithICallback<T>
  // >(uri: string, arg: ICallback | [new () => T, K]): IMethodRoute;

  /**
   * Register a PATCH route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  // public static patch<T extends BaseController, K extends KeysWithICallback<T>>(
  //   uri: string,
  //   arg: ICallback | [new () => T, K]
  // ): IMethodRoute;

  /**
   * Register an OPTIONS route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  // public static options<
  //   T extends BaseController,
  //   K extends KeysWithICallback<T>
  // >(uri: string, arg: ICallback | [new () => T, K]): IMethodRoute;

  /**
   * Register a HEAD route.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  // public static head<T extends BaseController, K extends KeysWithICallback<T>>(
  //   uri: string,
  //   arg: ICallback | [new () => T, K]
  // ): IMethodRoute;

  /**
   * Register a route that responds to any HTTP method.
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  // public static any<T extends BaseController, K extends KeysWithICallback<T>>(
  //   uri: string,
  //   arg: ICallback | [new () => T, K]
  // ): IMethodRoute;

  /**
   * Register a route for multiple specified HTTP methods.
   * @param methods - An array of HTTP methods (e.g., ['GET', 'POST']).
   * @param uri - The URI pattern.
   * @param arg - A callback function or a [Controller class, method name] tuple.
   */
  // public static match<T extends BaseController, K extends KeysWithICallback<T>>(
  //   methods: string[],
  //   uri: string,
  //   arg: ICallback | [new () => T, K]
  // ): IMethodRoute;

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
  // public static view(uri: string, view: string, data?: object): void;

  /**
   * Register a fallback route, typically used for 404 handling.
   * @param callback - A function to call when no route matches.
   */
  // public static fallback(callback: () => unknown): void;
}

export declare class IERoute extends IRoute {
  public static pushGroupReference(
    id: number,
    groupInstance: IGroupInstance
  ): void;
}
