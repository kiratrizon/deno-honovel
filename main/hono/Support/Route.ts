import BaseController from "../../Base/BaseController.ts";

import {
  IRoute,
  IGroupRoute,
  IMethodRoute,
} from "../../@hono-types/declaration/IRoute.d.ts"; /* this statement implements both normal interface & static interface */
import MethodRoute from "./MethodRoute.ts";

export type ICallback = (
  httpObj: HttpHono,
  ...args: unknown[]
) => Promise<unknown>;

type KeysWithICallback<T> = {
  [P in keyof T]: T[P] extends ICallback ? P : never;
}[keyof T];

class Route {
  private static routeId = 0;
  private static groupId = 0;
  private static storedControllers = {};
  private static currentGroup = [];
  private static groupPreference = {};
  private static methodPreference = {};
  private static defaultRoute = {
    get: [],
    post: [],
    put: [],
    delete: [],
    patch: [],
    options: [],
    head: [],
    all: [],
  };

  public static group() {}

  // Make `get` generic on controller T and method K
  public static get<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ): IMethodRoute {
    return new MethodRoute();
  }
}

export default Route;
