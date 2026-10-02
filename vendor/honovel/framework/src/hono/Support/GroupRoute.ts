import {
  IGroupInstance,
  IHeaderChildRoutes,
} from "../../../../@types/declaration/IRoute.d.ts";
import * as path from "node:path";
import { regexObj, URLArranger } from "./FunctionRoute.ts";

class Group {
  private static groupId = 0;
  private static currentGroup: string[] = [];

  public static get currGrp() {
    return Group.currentGroup;
  }
  public static get gID() {
    return Group.groupId;
  }
  private static currentAs: string[] = [];
  public static get currAs() {
    return Group.currentAs;
  }
  private static currentDomain: string | null = null;
  public static get currDomain() {
    return Group.currentDomain;
  }
  private static callbackCalled: boolean = false;
  private childRoutes: IHeaderChildRoutes = {
    get: [],
    post: [],
    options: [],
    put: [],
    delete: [],
    patch: [],
    head: [],
  };

  private onRoutes: Record<string, (keyof IHeaderChildRoutes)[]> = {};
  private resourceRoutes: number[] = [];

  private static groupReference: Record<number, InstanceType<typeof Group>> =
    {};

  private groupName: string = "";
  private asName: string = "";

  private flag: Record<string, unknown> = {
    where: {} satisfies Record<string, RegExp[]>,
  };

  public middleware(handler: string | string[] | HttpMiddleware): this {
    this.validateConfig("middleware", handler);

    return this;
  }

  public prefix(uri: string): this {
    this.validateConfig("prefix", uri);

    return this;
  }
  public domain(domain: string): this {
    this.validateConfig("domain", domain);
    return this;
  }
  public as(name: string): this {
    this.validateConfig("as", name);
    return this;
  }

  private validateConfig(methodName: string, value: unknown) {
    if (this.flag[methodName] && methodName !== "where") {
      throw new Error(`Method ${methodName} already exists`);
    }
    if (methodName === "middleware") {
      if (!isArray(value)) {
        this.flag[methodName] = [value];
        return;
      }
    }
    if (methodName === "domain") {
      if ((value as string).includes("?"))
        throw new Error(
          ` ${methodName.charAt(0).toUpperCase() + methodName.slice(1)} in group route cannot be optional`,
        );
    }
    if (methodName !== "where") {
      this.flag[methodName] = value;
    } else {
      if (!isObject(value)) {
        throw new Error("Where must be an object");
      }
      const newValue = value as Record<string, RegExp | RegExp[]>;
      for (const key in newValue) {
        const v = newValue[key];
        if (!keyExist(this.flag["where"] as Record<string, RegExp[]>, key)) {
          (this.flag["where"] as Record<string, RegExp[]>)[key] = [];
        }
        if (isArray(v)) {
          if (v.some((item) => !(item instanceof RegExp)) || v.length === 0) {
            throw new Error("Where value must be an array of RegExp");
          }
          (this.flag["where"] as Record<string, RegExp[]>)[key].push(...v);
        } else {
          if (!(v instanceof RegExp)) {
            throw new Error(
              "Where value must be a RegExp or an array of RegExp",
            );
          }
          (this.flag["where"] as Record<string, RegExp[]>)[key].push(v);
        }
      }
    }
    return;
  }

  private static groupIdList: number[] = [];

  // For storing the group loaders that are registered via groupRoutingAlias()
  public static groupLoaders: Record<string, () => Promise<unknown>> = {};

  // for storing the pending groups that are waiting to be loaded
  static #pendingGroups: {
    alias: string;
    inner: {
      groupId: number;
      currentGroup: string[];
      currentAs: string[];
      currentDomain: string | null;
    };
    outer: {
      groupId: number;
      currentGroup: string[];
      currentAs: string[];
      callbackCalled: boolean;
    };
  }[] = [];

  // For storing the aliases that have already been loaded, to prevent duplicate loading
  static #loadedAliases = new Set<string>();

  public static async drainPendingGroups(): Promise<void> {
    const ambient = {
      groupId: Group.groupId,
      currentGroup: Group.currentGroup,
      currentAs: Group.currentAs,
      currentDomain: Group.currentDomain,
      callbackCalled: Group.callbackCalled,
    };
    try {
      await Group.#drainPendingGroups();
    } finally {
      Group.groupId = ambient.groupId;
      Group.currentGroup = ambient.currentGroup;
      Group.currentAs = ambient.currentAs;
      Group.currentDomain = ambient.currentDomain;
      Group.callbackCalled = ambient.callbackCalled;
    }
  }

  static async #drainPendingGroups(): Promise<void> {
    while (Group.#pendingGroups.length) {
      const { alias, inner, outer } = Group.#pendingGroups.pop()!;

      if (Group.#loadedAliases.has(alias)) {
        console.warn(
          `Route group alias "${alias}" was already loaded; skipping. ` +
            `A route file can only be grouped once.`,
        );
        continue;
      }
      Group.#loadedAliases.add(alias);

      Group.groupId = inner.groupId;
      Group.currentGroup = inner.currentGroup;
      Group.currentAs = inner.currentAs;
      Group.currentDomain = inner.currentDomain;
      Group.callbackCalled = true;
      try {
        await Group.groupLoaders[alias]();
      } finally {
        Group.groupId = outer.groupId;
        Group.currentGroup = outer.currentGroup;
        Group.currentAs = outer.currentAs;
        Group.callbackCalled = outer.callbackCalled;
      }
    }
  }

  public group(callback: (() => void) | string): void {
    // check first in the groupRoutingAlias() if the callback is a string and not exist on the group
    if (isString(callback) && !Object.hasOwn(Group.groupLoaders, callback)) {
      const known = Object.keys(Group.groupLoaders);
      // throw and exit
      throw new Error(
        `Unknown route group alias "${callback}". ` +
          (known.length
            ? `Registered aliases: ${known.join(", ")}.`
            : `No aliases are registered - add one with groupRoutingAlias() in bootstrap/app.ts.`),
      );
    }
    const previousGroupId = Group.groupId;
    if (previousGroupId > 0) {
      const previousGroupInstance = Group.groupReference[previousGroupId];
      if (previousGroupInstance) {
        // get the middleware of the previous group
        const flagConf = previousGroupInstance?.flagConfig;
        const previousMiddleware = flagConf?.middleware;
        const previousWhere = flagConf.where;
        if (!isset(this.flag["middleware"])) {
          this.flag["middleware"] = [];
        }
        if (previousMiddleware) {
          this.flag["middleware"] = [
            ...(previousMiddleware as any[]),
            ...(this.flag["middleware"] as string[]),
          ];
        }
        if (!isset(this.flag["where"])) {
          this.flag["where"] = {};
        }
        if (previousWhere) {
          this.flag["where"] = { ...previousWhere };
        }
      }
    }
    if (Group.groupIdList.length === 0) {
      Group.groupIdList.push(0);
    }
    Group.groupId = Math.max(...Group.groupIdList) + 1;
    Group.groupIdList.push(Group.groupId);
    const currentGroup = Group.currentGroup;
    if (empty(this.flag["prefix"])) {
      Group.currentGroup = [...currentGroup, `*${Group.groupId}*`];
    } else {
      const prefix = this.flag["prefix"];
      if (isString(prefix)) {
        Group.currentGroup = [...currentGroup, prefix];
      } else {
        throw new Error("Prefix must be a string");
      }
    }
    const currentAs = Group.currentAs;
    if (isset(this.flag["as"]) && !empty(this.flag["as"])) {
      Group.currentAs = [...currentAs, this.flag["as"] as string];
    }

    if (
      isset(this.flag["domain"]) &&
      isString(this.flag["domain"]) &&
      !isset(Group.currentDomain)
    ) {
      Group.currentDomain = this.flag["domain"];
    }

    this.asName = Group.currentAs.join(".");
    const groupName = path.posix.join(...Group.currentGroup);
    this.groupName = groupName;
    Group.groupReference[Group.gID] = this;
    const callbackCalled = Group.callbackCalled;
    if (isFunction(callback)) {
      if (
        callbackCalled &&
        isset(this.flag["domain"]) &&
        !empty(this.flag["domain"]) &&
        isset(Group.currentDomain)
      ) {
        throw new Error(
          `Group domain already called for domain ${Group.currentDomain}`,
        );
      }
      Group.callbackCalled = true;
      callback();
      Group.groupId = previousGroupId; // Restore so sibling routes register to the outer group
      Group.callbackCalled = callbackCalled; // Reset the callback called state
      Group.currentAs = currentAs; // Reset to the previous "as" state
      Group.currentGroup = currentGroup; // Reset to the previous group
    }
    if (isString(callback)) {
      // if string, then it is an alias to a group loader registered via groupRoutingAlias()
      Group.#pendingGroups.push({
        alias: callback,
        inner: {
          groupId: Group.groupId,
          currentGroup: Group.currentGroup,
          currentAs: Group.currentAs,
          currentDomain: Group.currentDomain,
        },
        outer: {
          groupId: previousGroupId,
          currentGroup,
          currentAs,
          callbackCalled,
        },
      });
      // unset the current group state to the previous state, so that the next group can be registered correctly
      Group.groupId = previousGroupId;
      Group.callbackCalled = callbackCalled;
      Group.currentAs = currentAs;
      Group.currentGroup = currentGroup;
    }
  }

  public where(param: string, regex: RegExp): this {
    this.validateConfig("where", { [param]: regex });
    return this;
  }

  public whereNumber(key: string): this {
    this.validateConfig("where", { [key]: regexObj.number });
    return this;
  }

  public whereAlpha(key: string): this {
    this.validateConfig("where", { [key]: regexObj.alpha });
    return this;
  }
  public whereAlphaNumeric(key: string): this {
    this.validateConfig("where", { [key]: regexObj.alphanumeric });
    return this;
  }

  public static getGroupName(id: number) {
    return Group.groupReference[id];
  }
  public pushChildren(method: (keyof IHeaderChildRoutes)[], id: number) {
    this.onRoutes[id] = method;
  }

  public pushResource(resourceId: number): void {
    if (this.resourceRoutes.indexOf(resourceId) == -1) {
      this.resourceRoutes.push(resourceId);
    }
  }

  public get children() {
    return this.childRoutes;
  }

  public get name() {
    return this.groupName;
  }

  public get aName() {
    return this.asName;
  }

  public get flagConfig() {
    return {
      as: this.aName,
      name: this.name,
      domain: this.flag["domain"] ?? null,
      where: this.flag["where"] || {},
      middleware: this.flag["middleware"] || [],
    };
  }

  public get myRoutes(): Record<string, (keyof IHeaderChildRoutes)[]> {
    return this.onRoutes;
  }

  public get myResource() {
    return this.resourceRoutes;
  }
}

const GroupRoute: typeof IGroupInstance = Group;

export default GroupRoute;
