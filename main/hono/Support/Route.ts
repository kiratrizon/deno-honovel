import BaseController from "../../Base/BaseController.ts";

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

  static group() {}

  // Make `get` generic on controller T and method K
  static get<T extends BaseController, K extends KeysWithICallback<T>>(
    uri: string,
    arg: ICallback | [new () => T, K]
  ) {
    // Your method logic here
  }
}

export default Route;
