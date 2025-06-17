import BaseController from "../../Base/BaseController.ts";
import { plural, singular } from "https://deno.land/x/deno_plural/mod.ts";

import {
  IRoute,
  IMethodRoute,
  IGroupParams,
  IEGroupRoute,
  IReferencesRoute,
  HonoNext,
  IChildRoutes,
  IHeaderChildRoutes,
} from "../../@hono-types/declaration/IRoute.d.ts";
import MethodRoute from "./MethodRoute.ts";
import GR from "./GroupRoute.ts";
import { regexObj } from "./FunctionRoute.ts";
import ResourceRoute, {
  IResourceRouteConf,
  ResourceKeys,
} from "./ResourceRoute.ts";

const GroupRoute = GR as typeof IEGroupRoute;
export type ICallback = (
  httpObj: HttpHono,
  ...args: unknown[]
) => Promise<unknown>;

type KeysWithICallback<T> = {
  [P in keyof T]: T[P] extends ICallback ? P : unknown;
}[keyof T];

export class MyRoute {
  private static routeId = 0;
  private static resourceId = 0;
  private static groupPreference: IReferencesRoute["groups"] = {};
  private static methodPreference: IReferencesRoute["methods"] = {};
  private static defaultRoute: IReferencesRoute["defaultRoute"] = {};

  private static resourcePreference: Record<string, number[]> = {};

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
    handler:
      | string
      | (string | ((obj: HttpHono, next: HonoNext) => Promise<unknown>))[]
      | ((obj: HttpHono, next: HonoNext) => Promise<unknown>)
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

const Route: typeof IRoute = MyRoute;

export default Route;
