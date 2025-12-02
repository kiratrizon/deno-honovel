import * as path from "node:path";
import { toFileUrl } from "jsr:@std/path@0.224.0";
import { load, LoadOptions } from "dotenv";
try {
  const envObj = {
    examplePath: null,
  } as LoadOptions; // don't delete
  const data = await load(envObj);
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      Deno.env.set(key, value);
    }
  }
} catch (_) {}

if (Deno.env.get("VERCEL") == "1") {
  Deno.env.set("DENO_DEPLOYMENT_ID", Deno.env.get("VERCEL_URL") || "");
}

Object.defineProperty(globalThis, "globalFn", {
  value: function (key: string, value: (args: any[]) => void) {
    if (typeof key !== "string") {
      throw new Error("Key must be a string");
    }
    if (typeof value !== "function") {
      throw new Error("Value must be a function");
    }
    (globalThis as any)[key] = value;
  },
  writable: false,
  configurable: false,
});

// isString
globalFn("isString", function (value) {
  return typeof value === "string";
});

// isFunction
globalFn("isFunction", function (value) {
  if (!isString(value)) {
    return typeof value === "function";
  } else {
    if (isDefined(value)) {
      return typeof globalThis[value] === "function";
    }
  }
  return false;
});

// isArray
globalFn("isArray", function (value) {
  return Array.isArray(value);
});

// isObject
globalFn("isObject", function (value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
});

// isNumeric
globalFn("isNumeric", function (value) {
  return !isNaN(value) && !isNaN(parseFloat(value));
});

// isInteger
globalFn("isInteger", function (value) {
  return Number.isInteger(value);
});
// isFloat
globalFn("isFloat", function (value) {
  return typeof value === "number" && !Number.isInteger(value);
});
// isBoolean
globalFn("isBoolean", function (value) {
  return typeof value === "boolean";
});
// isNull
globalFn("isNull", function (value) {
  return value === null;
});

// isset
globalFn("isset", function (value) {
  return typeof value !== "undefined" && value !== null;
});

globalFn("keyExist", function (object, key) {
  if (typeof object !== "object" || object === null) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(object, key);
});

globalFn("isUndefined", function (value) {
  return !isset(value) && !isNull(value);
});

// empty
globalFn("empty", function (value) {
  return (
    isNull(value) ||
    (isArray(value) && value.length === 0) ||
    (isObject(value) && Object.keys(value).length === 0) ||
    (isString(value) && value.trim() === "") ||
    value === undefined
  );
});

// methodExist
globalFn("methodExist", function (object, method) {
  return typeof object[method] === "function";
});

globalFn("getType", (variable: unknown) => {
  const type = typeof variable;
  if (type === "object") {
    if (isArray(variable)) {
      return "array";
    }
    if (isObject(variable)) {
      return "object";
    }
    if (!variable) {
      return "NULL";
    }
  }
  return type;
});

globalFn("env", function (key: string, value: any = null): any {
  const raw = Deno.env.get(key);
  if (raw === undefined || raw === null) {
    return value;
  }

  if (isset(value)) {
    switch (getType(value)) {
      case "string":
        return raw;
      case "number":
        return parseFloat(raw);
      case "boolean":
        return raw.toLowerCase() === "true" || raw === "1";
      case "array":
      case "object":
        try {
          return JSON.parse(raw);
        } catch (_e) {
          console.error(
            `Failed to parse environment variable "${key}" as ${getType(value)}`
          );
          return value;
        }
    }
  }

  return raw;
});

globalFn("isDefined", function (key = "") {
  return key in globalThis;
});

globalFn(
  "define",
  function (key = "", value = null, configurable = true): void {
    if (key in globalThis) {
      return;
    }
    Object.defineProperty(globalThis, key, {
      value: value,
      writable: true,
      configurable,
    });
  }
);

globalFn("basePath", function (concatenation = "") {
  return path.join(Deno.cwd(), path.join(...concatenation.split("/")));
});

globalFn("storagePath", function (concatenation = "") {
  const dir = path.join("storage", concatenation);
  return basePath(dir);
});

globalFn("honovelPath", function (concatenation = "") {
  const dir = path.join("vendor", "honovel", "framework", "src", concatenation);
  return basePath(dir);
});

globalFn("appPath", function (concatenation = "") {
  const dir = path.join("app", concatenation);
  return basePath(dir);
});

globalFn("databasePath", function (concatenation = "") {
  const dir = path.join("database", concatenation);
  return basePath(dir);
});

globalFn("configPath", function (concatenation = "") {
  const dir = path.join("config", concatenation);
  return basePath(dir);
});
globalFn("publicPath", function (concatenation = "") {
  const dir = path.join("public", concatenation);
  return basePath(dir);
});
globalFn("storagePath", function (concatenation = "") {
  const dir = path.join("storage", concatenation);
  return basePath(dir);
});
globalFn("resourcePath", function (concatenation = "") {
  const dir = path.join("resources", concatenation);
  return basePath(dir);
});

globalFn("routePath", function (concatenation = "") {
  const dir = path.join("routes", concatenation);
  return basePath(dir);
});
globalFn("tmpPath", function (concatenation = "") {
  const dir = path.join("tmp", concatenation);
  return basePath(dir);
});

const isProd = env("APP_ENV") === "production";
define("IS_PRODUCTION", isProd, false);

const isStaging = env("APP_ENV") === "staging";
define("IS_STAGING", isStaging, false);

const isLocal = env("APP_ENV") === "local";
define("IS_LOCAL", isLocal, false);

globalFn(
  "writeFile",
  function (
    fileString = "",
    content = "",
    encoding: "utf8" | "utf16le" = "utf8"
  ) {
    if (!fileString) {
      console.warn("writeFile: Filename is required but not provided.");
      return;
    }

    try {
      if (encoding === "utf8") {
        // Best for plain text
        Deno.writeTextFileSync(fileString, content);
      } else {
        // For other encodings, convert manually
        const encoder = new TextEncoder(); // Always UTF-8
        const data = encoder.encode(content);
        Deno.writeFileSync(fileString, data);
      }
    } catch (err) {
      console.error(`writeFile: Failed to write to ${fileString}`, err);
      // no throw, just log
    }
  }
);

import Constants from "Constants";

globalFn("getConfigStore", async function (): Promise<Record<string, unknown>> {
  const configData: Record<string, unknown> = {};
  const configPath = basePath("config");
  const configFiles = Deno.readDirSync(configPath);
  const allModules: string[] = [];
  if (!isset(env("DENO_DEPLOYMENT_ID"))) {
    for (const file of configFiles) {
      if (file.isFile && file.name.endsWith(".ts")) {
        const configName = file.name.replace(".ts", "");
        const fullPath = path.join(configPath, file.name);
        const fullUrl = toFileUrl(fullPath).href;
        try {
          const module = await import(fullUrl);
          configData[configName] = module.default;
          if (!isset(configData[configName])) {
            throw new Error();
          }
          allModules.push(configName);
        } catch (_e) {
          consoledeno.warn(
            `Config file "config/${file.name}" does not export a default value.`
          );
        }
      }
    }
  } else {
    const conf = {};
    try {
      const module = await import("configs/build/myConfig.ts");
      const defaultConfig = module.default as Record<string, unknown>;
      Object.assign(conf, defaultConfig);
    } catch (_e) {
      //
    }
    return conf;
  }
  return configData;
});

/**
globalFn("getConfigStore", async function (): Promise<Record<string, unknown>> {
  const conf: Record<string, unknown> = {};
  const configFiles = Deno.readDirSync(basePath("config"));
  for (const file of configFiles) {
    if (file.isFile && file.name.endsWith(".ts")) {
      const configName = file.name.replace(".ts", "");
      try {
        // read the config file first before importing
        Deno.readFileSync(basePath(`config/${file.name}`));
        const module = await import(basePath(`config/${file.name}`));
        conf[configName] = module.default;
        // if (!isset(conf[configName])) {
        //   throw new Error();
        // }
      } catch (_e: any) {
        consoledeno.warn(_e);
      }
    }
  }
  return conf;
});
*/

define("myConfigData", await getConfigStore(), false);
const configure = new Constants(myConfigData as Record<string, unknown>);
globalFn(
  "config",
  function (
    key: string | { key: string; value: any },
    defaultValue: unknown = null
  ) {
    if (isString(key)) {
      return configure.read(key) || defaultValue;
    }
    if (isObject(key)) {
      configure.write(key.key, key.value);
      return key.value;
    }
  }
);

globalFn("viewPath", function (concatenation = "") {
  const dir = path.join(
    (config("view.defaultViewDir") as string) || "views",
    concatenation
  );
  return resourcePath(dir);
});

globalFn("only", function (obj: Record<string, any>, keys: string[]) {
  const result: Record<string, any> = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
});

globalFn("except", function (obj: Record<string, any>, keys: string[]) {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (!keys.includes(key)) {
      result[key] = obj[key];
    }
  }
  return result;
});

globalFn("ucFirst", function (str: string) {
  if (typeof str !== "string") {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
});

globalFn(
  "pathExist",
  async function (fileString: string = ""): Promise<boolean> {
    if (fileString === "") {
      return false;
    }
    try {
      await Deno.stat(fileString);
      return true;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return false;
      }
      throw err;
    }
  }
);

globalFn("makeDir", function (dirString = "") {
  if (dirString === "") {
    return;
  }

  try {
    // Always recursive, same as Node's { recursive: true }
    Deno.mkdirSync(dirString, { recursive: true });
  } catch (err) {
    if (err instanceof Deno.errors.AlreadyExists) {
      // Directory already exists → ignore
      return;
    }
    console.error(`makeDir: Failed to create directory ${dirString}`, err);
  }
});

globalFn("appendFile", function (fileString = "", content = "") {
  if (fileString === "") {
    return; // Return early if no filename is provided
  }

  try {
    // Append content, create file if it doesn't exist
    Deno.writeTextFileSync(fileString, content, { append: true });
  } catch (_e) {
    log(_e, "error", arguments.callee.name);
    return; // Swallow error, like your Node version
  }
});

globalFn("getFileContents", function (fileString = ""): string {
  if (fileString === "") {
    return ""; // Return empty string if no filename is provided
  }
  try {
    // Read and return the file content as a UTF-8 string
    return Deno.readTextFileSync(fileString);
  } catch (_e) {
    // log(_e, "error", arguments.callee.name);
    return ""; // Return empty string if there's an error
  }
});

globalFn("readFile", (filePath: string = ""): Uint8Array => {
  if (!filePath) {
    return new Uint8Array(); // Empty buffer if no file path
  }

  return Deno.readFileSync(filePath); // Read file as Uint8Array
});

import pluralize from "pluralize";
globalFn("generateTableName", function (entity: string = "") {
  // Split PascalCase / camelCase into words
  const splitWords = entity.split(/(?=[A-Z])/).map((w) => w.toLowerCase());

  // Pluralize the last word
  const lastWord = pluralize.plural(splitWords.pop()!);

  // Rejoin with underscores
  return [...splitWords, lastWord].join("_");
});

import { Buffer } from "@std/io";

globalFn("base64encode", function (str = "", safe = false) {
  const buf = new Buffer();
  buf.write(new TextEncoder().encode(str));
  let encoded = btoa(String.fromCharCode(...buf.bytes()));

  if (safe) {
    encoded = encoded
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return encoded;
});

globalFn("base64decode", function (str = "", safe = false) {
  let base64 = str;
  if (safe) {
    const padding =
      str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
    base64 = str.replace(/-/g, "+").replace(/_/g, "/") + padding;
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.split("").map((c) => c.charCodeAt(0)));
  const buf = new Buffer();
  buf.write(bytes);

  return new TextDecoder().decode(buf.bytes());
});
import { DateTime } from "luxon";

const getRelativeTime = (
  expression: string,
  direction: "next" | "last",
  now: DateTime
) => {
  const daysOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const lowerExpression = expression.toLowerCase();
  const dayIndex = daysOfWeek.indexOf(lowerExpression);

  if (dayIndex !== -1) {
    let daysDifference = dayIndex - now.weekday;

    if (direction === "next" && daysDifference <= 0) {
      daysDifference += 7;
    } else if (direction === "last" && daysDifference >= 0) {
      daysDifference -= 7;
    }

    return now.plus({ days: daysDifference }).toSeconds();
  }

  return now[direction === "next" ? "plus" : "minus"]({ days: 7 }).toSeconds();
};

const timeZone =
  config("app.timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone;

globalFn("strToTime", function (time, now) {
  if (time instanceof Carbon) {
    time = time.toString();
  }
  if (typeof time !== "string") {
    return null;
  }
  now = now || Date.now() / 1000;
  const adjustedNow = DateTime.fromSeconds(now).setZone(timeZone);

  if (time === "now") {
    return adjustedNow.toMillis();
  }
  time = time.trim().toLowerCase();

  let parsed = DateTime.fromISO(time, { zone: timeZone });
  if (!parsed.isValid) {
    parsed = DateTime.fromFormat(time, "yyyy-MM-dd HH:mm:ss", {
      zone: timeZone,
    });
  }
  if (parsed.isValid) {
    return parsed.toMillis();
  }

  const regexPatterns = {
    next: /^next\s+(.+)/,
    last: /^last\s+(.+)/,
    ago: /(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago$/,
    specificTime: /(\d{4}-\d{2}-\d{2})|(\d{2}:\d{2}(:\d{2})?)/,
  };

  const agoMatch = time.match(regexPatterns.ago);
  if (agoMatch) {
    const num = parseInt(agoMatch[1]);
    const unit = agoMatch[2];
    return adjustedNow.minus({ [unit]: num }).toMillis();
  }

  const nextMatch = time.match(regexPatterns.next);
  if (nextMatch) {
    return getRelativeTime(nextMatch[1], "next", adjustedNow);
  }

  const lastMatch = time.match(regexPatterns.last);
  if (lastMatch) {
    return getRelativeTime(lastMatch[1], "last", adjustedNow);
  }

  return null;
});

globalFn("date", function (format: string, unixTimestamp = null) {
  const result = Carbon.createFromTimestamp(unixTimestamp, format);
  return result.toString();
});

globalFn("time", () => {
  return strToTime("now");
});

globalFn("jsonEncode", function (data) {
  try {
    return JSON.stringify(data);
  } catch (_error) {
    return "";
  }
});

globalFn("jsonDecode", function (data) {
  try {
    return JSON.parse(data);
  } catch (_error) {
    return null;
  }
});

globalFn(
  "versionCompare",
  function (
    version1: string,
    version2: string,
    symbol: string = "<=>"
  ): boolean | number {
    const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10));

    const v1 = parse(version1);
    const v2 = parse(version2);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const n1 = v1[i] ?? 0;
      const n2 = v2[i] ?? 0;

      if (n1 !== n2) {
        if (!symbol || symbol === "<=>") {
          return n1 > n2 ? 1 : -1;
        }

        switch (symbol) {
          case ">":
          case "gt":
            return n1 > n2;
          case "<":
          case "lt":
            return n1 < n2;
          case ">=":
          case "gte":
            return n1 > n2 || n1 === n2;
          case "<=":
          case "lte":
            return n1 < n2 || n1 === n2;
          case "==":
          case "=":
          case "eq":
          case "===":
            return false; // parts differ
          case "!=":
          case "ne":
          case "!==":
            return true; // parts differ
          default:
            throw new Error("Invalid symbol: " + symbol);
        }
      }
    }

    // All parts equal
    if (!symbol || symbol === "<=>") {
      return 0;
    }

    switch (symbol) {
      case "!=":
      case "ne":
      case "!==":
        return false;
      case ">":
      case "gt":
      case "<":
      case "lt":
        return false;
      case "==":
      case "=":
      case "eq":
      case ">=":
      case "gte":
      case "<=":
      case "lte":
      case "===":
        return true;
      default:
        throw new Error("Invalid symbol: " + symbol);
    }
  }
);

import { Carbon } from "helpers";
import { DB } from "Illuminate/Support/Facades/index.ts";

globalFn("arrayFirst", function (array: unknown[]) {
  return isArray(array) && array.length > 0 ? array[0] : null;
});

globalFn("arrayLast", function (array: unknown[]) {
  return isArray(array) && array.length > 0 ? array[array.length - 1] : null;
});

globalFn("denoVersion", () => {
  const version = Deno.version.deno;
  return version ? version : "Unknown Deno version";
});

const version = (await import("../../version.ts")).default;

globalFn("frameworkVersion", () => {
  return {
    denoVersion: denoVersion(),
    honovelVersion: version,
  };
});

define("consoledeno", {
  error: (...msg: any) => console.error(`\x1b[31m[x] Error: \x1b[0m`, ...msg), // Red
  warn: (...msg: any) => console.warn(`\x1b[33m[!] Warning: \x1b[0m`, ...msg), // Yellow
  info: (...msg: any) => console.info(`\x1b[34m[i] Info: \x1b[0m`, ...msg), // Blue
  success: (...msg: any) => console.log(`\x1b[32m[✓] Success: \x1b[0m`, ...msg), // Green
  debug: (...msg: any) => console.debug(`\x1b[90m[>] Debug: \x1b[0m`, ...msg), // Grey
});

globalFn(
  "log",
  function (
    value: any,
    destination: string = "debug",
    identifier: string = ""
  ) {}
);

// import process from "node:process";

// process.on("warning", (warning) => {
//   console.warn(warning.name);
//   console.warn(warning.message);
//   console.warn(warning.stack);
// });

DB.init();
