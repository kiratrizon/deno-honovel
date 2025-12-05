import {
  IHeaderChildRoutes,
  IMethodRoute,
  IRoute,
} from "../../../../@types/declaration/IRoute.d.ts";

export type ResourceKeys =
  | "index"
  | "show"
  | "create"
  | "post"
  | "update"
  | "destroy"
  | "edit";

export interface IResourceRouteConf {
  thisRoutes: Record<number, (keyof IHeaderChildRoutes)[]>;
  identifier: Record<ResourceKeys, number>;
  route: IRoute;
}

export default class ResourceRoute {
  private allRoutes: IResourceRouteConf["thisRoutes"];
  private identifiers: IResourceRouteConf["identifier"];
  private filteringProc: boolean = false;
  private mode: "only" | "except" | null = null;
  private filterKeys: ResourceKeys[] = [];
  private static route: IRoute;

  constructor(config: IResourceRouteConf) {
    this.allRoutes = config.thisRoutes;
    this.identifiers = config.identifier;
    if (!ResourceRoute.route) {
      ResourceRoute.route = config.route;
    }
  }

  public only(keys: ResourceKeys[]): this {
    if (this.filteringProc) {
      throw new Error(`You can't use both 'only()' and 'except()'`);
    }
    this.filteringProc = true;
    this.mode = "only";
    this.filterKeys = keys;
    return this;
  }

  public except(keys: ResourceKeys[]): this {
    if (this.filteringProc) {
      throw new Error(`You can't use both 'only()' and 'except()'`);
    }
    this.filteringProc = true;
    this.mode = "except";
    this.filterKeys = keys;
    return this;
  }

  public where(param: string, regex: RegExp): this {
    if (!empty(this.allRoutes)) {
      const entries = Object.entries(this.allRoutes);
      entries.forEach(([id]) => {
        // @ts-ignore //
        const methodUsed: IMethodRoute = ResourceRoute.route.getMethod(id);
        if (!isNull(methodUsed)) {
          methodUsed.where(param, regex);
        }
      });
    }
    return this;
  }

  public whereNumber(key: string): this {
    if (!empty(this.allRoutes)) {
      const entries = Object.entries(this.allRoutes);
      entries.forEach(([id]) => {
        // @ts-ignore //
        const methodUsed: IMethodRoute = ResourceRoute.route.getMethod(id);
        if (!isNull(methodUsed)) {
          methodUsed.whereNumber(key);
        }
      });
    }
    return this;
  }

  public whereAlpha(key: string): this {
    if (!empty(this.allRoutes)) {
      const entries = Object.entries(this.allRoutes);
      entries.forEach(([id]) => {
        // @ts-ignore //
        const methodUsed: IMethodRoute = ResourceRoute.route.getMethod(id);
        if (!isNull(methodUsed)) {
          methodUsed.whereAlpha(key);
        }
      });
    }
    return this;
  }

  public whereAlphaNumeric(key: string): this {
    if (!empty(this.allRoutes)) {
      const entries = Object.entries(this.allRoutes);
      entries.forEach(([id]) => {
        // @ts-ignore //
        const methodUsed: IMethodRoute = ResourceRoute.route.getMethod(id);
        if (!isNull(methodUsed)) {
          methodUsed.whereAlphaNumeric(key);
        }
      });
    }
    return this;
  }

  public get myRouters() {
    if (!this.mode) {
      // No filtering — return original routes
      return this.allRoutes;
    }

    const keysToInclude =
      this.mode === "only"
        ? this.filterKeys
        : (Object.keys(this.identifiers) as ResourceKeys[]).filter(
            (k) => !this.filterKeys.includes(k)
          );

    const filteredRoutes: Record<number, (keyof IHeaderChildRoutes)[]> = {};

    for (const key of keysToInclude) {
      const index = this.identifiers[key];
      if (this.allRoutes[index]) {
        filteredRoutes[index] = this.allRoutes[index];
      }
    }

    return filteredRoutes;
  }
}
