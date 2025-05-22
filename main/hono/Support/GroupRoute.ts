import {
  IChildRoutes,
  IGroupInstance,
} from "../../@hono-types/declaration/IRoute.d.ts";
import path from "node:path";

class Group {
  private static groupId = 0;
  private static currentGroup: string[] = [];

  public static get currGrp() {
    return Group.currentGroup;
  }
  public static get gID() {
    return Group.groupId;
  }
  private childRoutes: IChildRoutes = {
    get: [],
    post: [],
    options: [],
    put: [],
    delete: [],
    head: [],
    patch: [],
    all: [],
  };

  private static groupReference: Record<number, InstanceType<typeof this>> = {};

  private groupName: string = "";

  private flag: Record<string, [boolean, unknown]> = {};

  public middleware(
    handler: string | string[] | (() => Promise<unknown>)
  ): this {
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
    if (this.flag[methodName]) {
      throw new Error(`Method ${methodName} already exists`);
    }
    this.flag[methodName] = [true, value];
  }

  private middlewareHandler(
    handler: string | string[] | (() => Promise<unknown>)
  ) {}

  public group(callback: () => void): void {
    Group.groupId++;
    const currentGroup = Group.currentGroup;
    if (empty(this.flag["prefix"])) {
      Group.currentGroup = [...currentGroup, `${Group.groupId}`];
    } else {
      const prefix = this.flag["prefix"][1];
      if (is_string(prefix)) {
        Group.currentGroup = [...currentGroup, prefix];
      } else {
        throw new Error("Prefix must be a string");
      }
    }
    const groupName = Group.groupCombiner().string;
    this.groupName = groupName;
    Group.groupReference[Group.groupId] = this;
    if (is_function(callback)) {
      callback();
    }
    Group.currentGroup = currentGroup; // Reset to the previous group
  }

  private static groupCombiner() {
    const groups = Group.currentGroup;
    let convertion = path.join(...groups);
    if (convertion === ".") {
      convertion = "";
    }
    return this.processString(convertion);
  }

  private static processString(input: string) {
    const requiredParams: string[] = [];
    const optionalParams: string[] = [];
    if (input === "" || input === "/") {
      return { string: input, requiredParams, optionalParams };
    }
    const regex = {
      digit: /^\d+$/,
      alpha: /^[a-zA-Z]+$/,
      alphanumeric: /^[a-zA-Z0-9]+$/,
      slug: /^[a-z0-9-]+$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    };
    // Step 1: Replace multiple slashes with a single slash
    input = input.replace(/\/+/g, "/");

    if (input.startsWith("/")) {
      input = input.slice(1); // Remove leading slash
    }
    if (input.endsWith("/")) {
      input = input.slice(0, -1); // Remove trailing slash
    }
    // Step 2: Split the string by slash
    const parts = input.split("/");

    const result = parts.map((part) => {
      const constantPart = part;
      if (part.startsWith("{") && part.endsWith("}")) {
        // Handle part wrapped in {}
        let isOptional = false;
        part = part.slice(1, -1); // Remove curly braces

        // Check if it's optional
        if (part.endsWith("?")) {
          part = part.slice(0, -1); // Remove the '?' character
          isOptional = true;
        }

        // If it's an alpha string, handle it
        if (regex.alphanumeric.test(part)) {
          if (isOptional) {
            optionalParams.push(part);
            return `:${part}?`; // Optional, wrapped with ":"
          } else {
            requiredParams.push(part);
            return `:${part}`; // Non-optional, just with ":"
          }
        }

        throw new Error(
          `${JSON.stringify(constantPart)} is not a valid parameter name`
        );
      } else {
        if (regex.digit.test(part)) {
          return `${part}`;
        }
        if (regex.alpha.test(part)) {
          return `${part}`;
        }
        if (regex.alphanumeric.test(part)) {
          return `${part}`;
        }
        if (regex.slug.test(part)) {
          return `${part}`;
        }
        if (regex.uuid.test(part)) {
          return `${part}`;
        }

        if (part.startsWith("*") && part.endsWith("*")) {
          const type = part.slice(1, -1); // remove * *

          if (regex.digit.test(type)) {
            return `${part}`;
          }
        }
        throw new Error(`${constantPart} is not a valid route`);
      }
    });
    let modifiedString = `/${path.join(...result)}`;
    if (modifiedString.endsWith("/") && modifiedString.length > 1) {
      modifiedString = modifiedString.slice(0, -1).replace(/\/\{/g, "{/"); // Remove trailing slash
    } else {
      modifiedString = modifiedString.replace(/\/\{/g, "{/");
    }
    return { string: modifiedString, requiredParams, optionalParams };
  }

  public getGroup() {
    return {};
  }

  public static getGroupName(id: number) {
    return Group.groupReference[id];
  }
  public pushChilds(method: keyof IChildRoutes, id: number) {
    this.childRoutes[method].push(id);
  }
}

const GroupRoute: typeof IGroupInstance = Group;

export default GroupRoute;
