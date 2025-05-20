import process from "node:process";
import path from "node:path";
import "https://deno.land/std@0.224.0/dotenv/load.ts";

Object.defineProperty(globalThis, "globalFn", {
  // deno-lint-ignore no-explicit-any
  value: function (key: string, value: (args: any[]) => void) {
    if (typeof key !== "string") {
      throw new Error("Key must be a string");
    }
    if (typeof value !== "function") {
      throw new Error("Value must be a function");
    }
    // deno-lint-ignore no-explicit-any
    (globalThis as any)[key] = value;
  },
  writable: false,
  configurable: false,
});

// deno-lint-ignore no-explicit-any
globalFn("env", function (key: string, value: any = null): any {
  if (Deno.env.get(key) === undefined || Deno.env.get(key) === null) {
    return value;
  }
  return Deno.env.get(key);
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

const isProd = env("DENO_ENV") === "production";
define("IS_PRODUCTION", isProd, false);

const isStaging = env("DENO_ENV") === "staging";
define("IS_STAGING", isStaging, false);

const isLocal = env("DENO_ENV") === "local";
define("IS_LOCAL", isLocal, false);

globalFn("basePath", function (concatenation = "") {
  return path.join(process.cwd(), concatenation);
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
globalFn("viewPath", function (concatenation = "") {
  const dir = path.join("views", concatenation);
  return resourcePath(dir);
});
globalFn("routePath", function (concatenation = "") {
  const dir = path.join("routes", concatenation);
  return basePath(dir);
});
globalFn("tmpPath", function (concatenation = "") {
  const dir = path.join("tmp", concatenation);
  return basePath(dir);
});

async function rewriteConfigModules(filePath: string, allModules: string[]) {
  // check if filePath and allModules are equal
  const importedFilePath: string[] = (await import(filePath)).default;
  if (importedFilePath.join(",") === allModules.join(",")) {
    console.log("No changes needed to be made");
    return;
  }
  const stub = `const configModules: string[] = {{ value }};\n\nexport default configModules;\n`;

  // Convert allModules array to TypeScript array literal
  const arrayLiteral = `[${allModules.map((m) => `"${m}"`).join(", ")}]`;

  // Replace {{ value }} with the array string
  const result = stub.replace("{{ value }}", arrayLiteral);

  // Overwrite the target file
  await Deno.writeTextFile(filePath, result);
}

import Configure from "Configure";

// deno-lint-ignore no-explicit-any
globalFn("getConfigStore", async function (): Promise<Record<string, any>> {
  const configPath = basePath("config");
  // deno-lint-ignore no-explicit-any
  const configData: Record<string, any> = {};
  const configFiles = Deno.readDirSync(configPath);
  const allModuleFiles: string[] = [];
  for (const file of configFiles) {
    if (file.isFile && file.name.endsWith(".ts")) {
      allModuleFiles.push(file.name);
      const configName: string = file.name.replace(".ts", "")!;
      const module = await import(
        new URL(`../../config/${file.name}`, import.meta.url).href
      );
      configData[configName] = module;
    }
  }
  return configData;
});

const configData = await getConfigStore();
const configure = new Configure(configData);

globalFn("staticConfig", function (key: string) {
  return configure.read(key);
});

const dbUsed = staticConfig("database.database") || "sqlite";
define("dbUsed", dbUsed, false);

// deno-lint-ignore no-explicit-any
globalFn("only", function (obj: Record<string, any>, keys: string[]) {
  // deno-lint-ignore no-explicit-any
  const result: Record<string, any> = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
});

// deno-lint-ignore no-explicit-any
globalFn("except", function (obj: Record<string, any>, keys: string[]) {
  // deno-lint-ignore no-explicit-any
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

import fs from "node:fs";
globalFn("pathExist", function (fileString: string = "") {
  if (fileString === "") {
    return false;
  }
  const returndata = fs.existsSync(fileString);
  return returndata;
});
globalFn("writeFile", function (fileString = "", content = "") {
  if (fileString === "") {
    throw new Error("Filename is required.");
  }
  fs.writeFileSync(fileString, content, "utf8");
});

globalFn("makeDir", function (dirString = "") {
  if (dirString === "") {
    return;
  }
  // Check if the directory exists, and create it if it doesn't
  if (!fs.existsSync(dirString)) {
    fs.mkdirSync(dirString, { recursive: true });
  }
});

globalFn("appendFile", function (fileString = "", content = "") {
  if (fileString === "") {
    return; // Return early if no filename is provided
  }

  try {
    // Append content to the file, creating it if it doesn't exist
    fs.appendFileSync(fileString, content, "utf8");
  } catch (_e) {
    log(_e, "error", arguments.callee.name);
    return; // Return if there's an error, no exception thrown
  }
});

globalFn("getFileContents", function (fileString = "") {
  if (fileString === "") {
    return ""; // Return empty string if no filename is provided
  }
  try {
    // Read and return the file content as a UTF-8 string
    return fs.readFileSync(fileString, "utf8");
  } catch (_e) {
    log(_e, "error", arguments.callee.name);
    return ""; // Return empty string if there's an error
  }
});

import Logger from "HonoLogger";

globalFn(
  "log",
  function (
    // deno-lint-ignore no-explicit-any
    value: any,
    destination: string = "debug",
    identifier: string = ""
  ) {
    Logger.log(value, destination, identifier);
  }
);

const irregularPlurals = staticConfig("irregular_words");

globalFn("generateTableName", function (entity: string = "") {
  const splitWords = entity.split(/(?=[A-Z])/);
  const lastWord = splitWords.pop()!.toLowerCase();

  const pluralizedLastWord = (() => {
    if (irregularPlurals[lastWord]) {
      return irregularPlurals[lastWord];
    }
    if (lastWord.endsWith("y")) {
      return lastWord.slice(0, -1) + "ies";
    }
    if (
      ["s", "x", "z", "ch", "sh"].some((suffix) => lastWord.endsWith(suffix))
    ) {
      return lastWord + "es";
    }
    return lastWord + "s";
  })();

  return [...splitWords, pluralizedLastWord].join("").toLowerCase();
});

import { Buffer } from "node:buffer";

globalFn("base64encode", function (str = "", safe = false) {
  if (safe) {
    return Buffer.from(str)
      .toString("base64") // Standard Base64 encode
      .replace(/\+/g, "-") // Replace `+` with `-`
      .replace(/\//g, "_") // Replace `/` with `_`
      .replace(/=+$/, ""); // Remove any trailing `=` padding
  }
  return Buffer.from(str).toString("base64");
});

globalFn("base64decode", function (str = "", safe = false) {
  if (safe) {
    // Add necessary padding if missing
    const padding =
      str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + padding;
    return Buffer.from(base64, "base64").toString("utf8");
  }
  return Buffer.from(str, "base64").toString("utf8");
});
import { DateTime, DurationLike } from "luxon";

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
  staticConfig("app.timezone") ||
  Intl.DateTimeFormat().resolvedOptions().timeZone;

globalFn("strtotime", function (time, now) {
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

const configApp = staticConfig("app") as {
  timezone?: string;
  datetime_format?: string;
  date_format?: string;
  time_format?: string;
};

class Carbon {
  private static formatMapping: Record<string, string> = {
    Y: "yyyy",
    y: "yy",
    m: "MM",
    n: "M",
    d: "dd",
    j: "d",
    H: "HH",
    h: "hh",
    i: "mm",
    s: "ss",
    A: "a",
    T: "z",
    e: "ZZ",
    o: "yyyy",
    P: "ZZ",
    c: "yyyy-MM-dd'T'HH:mm:ssZZ",
    r: "EEE, dd MMM yyyy HH:mm:ss Z",
    u: "yyyy-MM-dd HH:mm:ss.SSS",
    W: "W",
    N: "E",
    z: "o",
  };

  private timeAlters: DurationLike = {
    years: 0,
    months: 0,
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };

  public addDays(days: number = 0): this {
    this.timeAlters.days! += days;
    return this;
  }

  public addHours(hours: number = 0): this {
    this.timeAlters.hours! += hours;
    return this;
  }

  public addMinutes(minutes: number = 0): this {
    this.timeAlters.minutes! += minutes;
    return this;
  }

  public addSeconds(seconds: number = 0): this {
    this.timeAlters.seconds! += seconds;
    return this;
  }

  public addYears(years: number = 0): this {
    this.timeAlters.years! += years;
    return this;
  }

  public addMonths(months: number = 0): this {
    this.timeAlters.months! += months;
    return this;
  }

  public addWeeks(weeks: number = 0): this {
    this.timeAlters.weeks! += weeks;
    return this;
  }

  private generateDateTime(): DateTime {
    return DateTime.now()
      .plus(this.timeAlters)
      .setZone(configApp.timezone || "UTC");
  }

  public getByFormat(format: string): string {
    if (typeof format !== "string") {
      throw new Error("Invalid format");
    }

    const time = this.generateDateTime();
    const formattings = Object.keys(Carbon.formatMapping);
    let newFormat = "";

    for (let i = 0; i < format.length; i++) {
      if (formattings.includes(format[i])) {
        newFormat += Carbon.formatMapping[format[i]];
      } else {
        newFormat += format[i];
      }
    }

    return time.toFormat(newFormat);
  }

  getDateTime(): string {
    return this.getByFormat(configApp.datetime_format || "Y-m-d H:i:s");
  }

  getDate(): string {
    return this.getByFormat(configApp.date_format || "Y-m-d");
  }

  getTime(): string {
    return this.getByFormat(configApp.time_format || "H:i:s");
  }

  getByUnixTimestamp(unixTimestamp: number, format: string): string {
    if (typeof unixTimestamp !== "number") {
      return this.getByFormat(format);
    }
    if (typeof format !== "string") {
      throw new Error(`Invalid format: ${format}`);
    }

    const time = DateTime.fromSeconds(unixTimestamp).setZone(
      configApp.timezone || "GMT+08:00"
    );
    const formattings = Object.keys(Carbon.formatMapping);
    let newFormat = "";

    for (let i = 0; i < format.length; i++) {
      if (formattings.includes(format[i])) {
        newFormat += Carbon.formatMapping[format[i]];
      } else {
        newFormat += format[i];
      }
    }

    return time.toFormat(newFormat);
  }
}

globalFn("date", function (format: string, unixTimestamp = null) {
  const carbon = new Carbon();
  return carbon.getByUnixTimestamp(unixTimestamp, format);
});

globalFn("time", () => {
  return strtotime("now");
});

// is_string
globalFn("is_string", function (value) {
  return typeof value === "string";
});

// is_array
globalFn("is_array", function (value) {
  return Array.isArray(value);
});

// is_object
globalFn("is_object", function (value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
});

// is_numeric
globalFn("is_numeric", function (value) {
  return !isNaN(value) && !isNaN(parseFloat(value));
});

// is_integer
globalFn("is_integer", function (value) {
  return Number.isInteger(value);
});
// is_float
globalFn("is_float", function (value) {
  return typeof value === "number" && !Number.isInteger(value);
});
// is_boolean
globalFn("is_boolean", function (value) {
  return typeof value === "boolean";
});
// is_null
globalFn("is_null", function (value) {
  return value === null;
});

// isset
globalFn("isset", function (value) {
  return typeof value !== "undefined" && value !== null;
});

globalFn("key_exist", function (object, key) {
  if (typeof object !== "object" || object === null) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(object, key);
});

// empty
globalFn("empty", function (value) {
  return (
    is_null(value) ||
    (is_array(value) && value.length === 0) ||
    (is_object(value) && Object.keys(value).length === 0) ||
    (is_string(value) && value.trim() === "") ||
    value === undefined
  );
});

// method_exist
globalFn("method_exist", function (object, method) {
  return typeof object[method] === "function";
});

globalFn("json_encode", function (data) {
  return JSON.stringify(data);
});

globalFn("json_decode", function (data) {
  if (is_string(data)) {
    return JSON.parse(data);
  }
  return data;
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

const frameworkVersion = (await import(basePath("version.ts"))).default;

define("FRAMEWORK_VERSION", frameworkVersion, false);
