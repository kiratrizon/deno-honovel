import { ConfigItems } from "configs/@types/index.d.ts";
import { Carbon } from "helpers";

export {};

type IGetType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "NULL"
  | "undefined";

type IVersionSymbol =
  | "<"
  | "<="
  | "=="
  | "==="
  | "!="
  | "!==="
  | ">="
  | ">"
  | "<>"
  | "<=>";
type IVersionOperator = "lt" | "lte" | "eq" | "ne" | "gt" | "gte" | "cmp";
declare global {
  /**
   * This file assigns global variables and functions for the application.
   * It includes utility functions, configuration options, and other helpers
   * that can be used throughout the application.
   */
  function globalFn<T extends (...args: any[]) => any>(
    name: string,
    fn: T
  ): void;

  /**
   * Retrieves the value of the specified environment variable.
   *
   * - If a fallback value is provided and the variable exists, the result is converted to the same type as the fallback.
   * - If no fallback is provided, the result is returned as a `string`.
   * - If the variable is not set, the fallback is returned if provided; otherwise, `null` is returned.
   *
   * @example
   * const host = env("APP_KEY"); // string or null
   * const port = env("APP_PORT", 2000); // number
   *
   * @param {string} key - The name of the environment variable to retrieve.
   * @param {T} [fallback] - An optional fallback value to return (and type to infer) if the variable is not set.
   * @returns {string | T | null} The environment variable's value, or the fallback, or `null` if not set.
   */
  function env<K extends keyof EnvConfig>(key: K): string;
  function env(key: string): string | null;
  function env<K extends keyof EnvConfig>(
    key: K,
    fallback: EnvConfig[K]
  ): EnvConfig[K];
  function env<K extends any = string>(key: string, fallback: K): K;

  /**
   * Defines a global variable on `global` with the specified name and value.
   * The variable will be writable but not configurable, meaning:
   * - It can be modified but not deleted.
   * - If the variable already exists, it cannot be redefined.
   *
   * Usage:
   *   define("myVar", 123);
   *   console.log(global.myVar); // 123
   *
   * @param {string} name - The name of the global variable.
   * @param {unknown} value - The value to assign to the global variable.
   * @throws {Error} If the global variable already exists.
   */
  function define(name: string, value: unknown, configurable?: boolean): void;

  /**
   * Checks whether a given variable is defined in the current scope.
   * It returns true if the variable exists, otherwise false.
   */
  function isDefined(value: string): value is keyof typeof globalThis;

  /**
   * Get the type of a variable.
   * Returns a string representing the type of the variable.
   */
  function getType(variable: unknown): IGetType;

  /**
   * Dynamically imports a module relative to the specified base path.
   *
   * @param file - The relative path to the module file (from basePath).
   * @returns A promise that resolves to the imported module.
   */
  function dynamicImport<T = unknown>(file: string): Promise<T>;

  /**
   * Retrieves the value of a configuration option, similar to Laravel's `config` helper function.
   * Supports dot notation for nested configuration keys.
   *
   * Usage:
   *   const value = await config('app.name'); // Retrieves the value of `app.name`
   *   const value = await config('database.connections.mysql.host'); // Retrieves the value of a nested key
   *
   * @param {string} key - The configuration key, which can use dot notation for nested values.
   * @returns {unknown} The value of the configuration option, or `undefined` if the key does not exist.
   */
  function config<T extends keyof ConfigItems>(
    key: T,
    defaultValue?: ConfigItems[T]
  ): ConfigItems[T];
  function config(key: string, defaultValue?: unknown): unknown;
  function config({
    key,
    value,
  }: {
    key: string;
    value: unknown;
  }): typeof value;
  /**
   * Initializes the configuration store by reading all configuration files in the config directory.
   */
  function getConfigStore(): Promise<Record<string, unknown>>;

  /**
   * Restricts an object to only the specified keys.
   * Returns a new object containing only the provided keys and their associated values.
   *
   * Usage:
   *   const filtered = only(obj, ['key1', 'key2']);
   *
   * @param {Record<string, unknown>} source - The object to filter.
   * @param {string[]} keys - The list of keys to include in the new object.
   * @returns {Record<string, unknown>} A new object containing only the specified keys.
   */
  function only<T extends Record<string, unknown>, K extends keyof T>(
    source: T,
    keys: K[]
  ): Pick<T, K>;

  /**
   * Removes the specified keys from an object.
   * Returns a new object excluding the provided keys and retaining the rest.
   *
   * Usage:
   *   const cleaned = except(obj, ['password', 'token']);
   *
   * @param {Record<string, unknown>} source - The object to filter.
   * @param {string[]} keys - The list of keys to exclude from the new object.
   * @returns {Record<string, unknown>} A new object without the specified keys.
   */
  function except(
    source: Record<string, unknown>,
    keys: string[]
  ): Record<string, unknown>;

  /**
   * Converts the first character of a string to uppercase while keeping the rest unchanged.
   *
   * Usage:
   *   const result = ucFirst('example'); // 'Example'
   *
   * @param {string} str - The string to transform.
   * @returns {string} The string with the first character capitalized.
   */
  function ucFirst(str: string): string;

  /**
   * Writes the serialized content of a variable to a log file.
   * The log file will be created at `rootapplication/tmp/{logName}.log`.
   *
   * Usage:
   *   log({ key: 'value' }, 'debug'); // Writes the object to `tmp/debug.log`
   *
   * @param {unknown} variable - The variable to write into the log file. Can be any type (string, object, array, etc.).
   * @param {string} logName - The name of the log file (without extension).
   * @returns {void}
   */
  function log(variable: unknown, logName: string, prefix?: string): void;

  /**
   * The base path of the application, typically the root directory.
   * This is used as the starting point for resolving all other paths.
   */
  function basePath(concatenation?: string): string;

  /**
   * The path to the application's storage directory, which typically contains cache or tmp files.
   */
  function storagePath(concatenation?: string): string;

  /**
   * The path of the application's framework directory, which contains the core framework files.
   */

  function honovelPath(concatenation?: string): string;

  /**
   * The path to the application's resources directory, which typically contains views, translations, and other assets.
   */
  function resourcePath(concatenation?: string): string;

  /**
   * The path to the application's view directory, where view files (such as Blade templates) are stored.
   */
  function viewPath(concatenation?: string): string;

  /**
   * The path to the public directory, which is typically the web server's document root.
   * This is where publicly accessible files like images, JavaScript, and CSS are located.
   */
  function publicPath(concatenation?: string): string;

  /**
   * The path to the public directory, which is typically the web server's document root.
   * This is where publicly accessible files.
   */
  function uploadPath(concatenation?: string): string;

  /**
   * The path to the database directory, where database-related files or configurations might be stored.
   */
  function databasePath(concatenation?: string): string;

  /**
   * The path to the application's core directory, where the main application logic is stored.
   */
  function appPath(concatenation?: string): string;

  /**
   * The path to the stub directory, where template files or skeleton code files (stubs) are stored.
   */
  function stubPath(): string;

  /**
   * Resolves the path to a controller file based on the given controller name.
   *
   * This function returns the path to a controller, typically relative to your controllers directory.
   * It constructs the path by combining a base path with the provided controller name, assuming the standard file structure.
   *
   * Usage:
   *   controllerPath('UserController');  // "/path/to/controllers/UserController.mjs"
   *   controllerPath('AdminController'); // "/path/to/controllers/AdminController.mjs"
   *
   * @param controller - The name of the controller (e.g., "UserController").
   * @returns The path to the controller file as a string.
   */
  function controllerPath(concatenation?: string): string;

  /**
   * tmp path
   */
  function tmpPath(concatenation?: string): string;

  /**
   * Checks whether a file exists relative to a predefined base path.
   *
   * Usage:
   *   const exists = fileExist('path/to/file.txt');
   *
   * - If no path is provided, returns `false`.
   * - Resolves the file path relative to `'../../../'` from the current `__dirname`.
   * - Uses `fs.existsSync` for synchronous existence checking.
   *
   * @param fileString - Relative file path from the base path.
   * @returns `true` if the file exists, otherwise `false`.
   */
  function pathExist(fileString?: string): Promise<boolean>;

  /**
   * Writes the provided content to a file relative to the base path.
   *
   * Usage:
   *   writeFile('path/to/file.txt', 'Hello World');
   *
   * - Resolves the file path relative to `'../../../'` from the current `__dirname`.
   * - Synchronously writes the content using UTF-8 encoding.
   *
   * @param fileString - The relative path to the file.
   * @param content - The string content to write into the file.
   */
  function writeFile(fileString: string, content: string): void;

  /**
   * Creates a directory (including parent directories) if it doesn't already exist.
   *
   * Usage:
   *   makeDir('path/to/directory');
   *
   * - Resolves the directory path relative to `'../../../'` from the current `__dirname`.
   * - Uses `fs.mkdirSync` with the `{ recursive: true }` option to create any missing parent directories.
   *
   * @param dirString - The relative path of the directory to create.
   */
  function makeDir(dirString: string): void;

  /**
   * Appends content to a file, creating the file if it doesn't already exist.
   *
   * Usage:
   *   appendFile('path/to/file.txt', 'Additional content');
   *
   * - Resolves the file path relative to `'../../../'` from the current `__dirname`.
   * - Uses `fs.appendFileSync` to append content with UTF-8 encoding.
   *
   * @param fileString - The relative path to the file.
   * @param content - The string content to append to the file.
   */
  function appendFile(fileString: string, content: string): void;

  /**
   * Generates a table name based on the given model name.
   * Typically used to follow naming conventions for database tables.
   *
   * Usage:
   *   const tableName = generateTableName('User'); // Generates 'users' table name
   *   const tableName = generateTableName('Post'); // Generates 'posts' table name
   *
   * @param {string} modelName - The model name (e.g., 'User', 'Post') for which to generate the table name.
   * @returns {string} The generated table name, typically plural and in snake_case.
   */
  function generateTableName(modelName: string): string;

  /**
   * Encodes a string to standard Base64.
   */
  function base64encode(str: string, safe?: boolean): string;

  /**
   * Decodes a standard Base64 string to its original form.
   */
  function base64decode(str: string, safe?: boolean): string;

  /**
   * This function mimics PHP's strtotime by parsing a string containing a date or time
   * and returning the corresponding Unix timestamp (in seconds). It supports relative
   * date/time formats such as "next Friday" or "3 days ago" and adjusts based on the
   * system's time zone.
   */
  function strToTime(time: Carbon | string | null, now?: number): number | null;

  /**
   * This function returns the current date and time
   * in the specified format (e.g., "Y-m-d H:i:s"). If no timestamp is provided,
   * it returns the current system time formatted accordingly.
   */
  function date(format?: string, timestamp?: number | null): string;

  /**
   * This function returns the current date and time
   * in the specified format (e.g., "Y-m-d H:i:s"). If no timestamp is provided,
   * it returns the current system time formatted accordingly.
   */
  function DATE(format: string, timestamp?: number): string;

  /**
   * Returns strToTime("now") in milliseconds.
   */
  function time(): number;

  /**
   * Transfer a file into a new location.
   * @param {string} filePath - The path to the file to be transferred.
   * @param {string} destination - The destination path where the file should be transferred.
   */
  function transferFile(filePath: string, destination: string): boolean;

  /**
   * Checks whether a given variable is a function.
   */
  function isFunction(
    variable: unknown
  ): variable is (...args: unknown[]) => unknown;

  /**
   * Checks if the given value is a string.
   */
  function isString(value: unknown): value is string;

  /**
   * Checks if the given value is an array.
   */
  function isArray<T = any>(value: any): value is T[];

  /**
   * Checks if the given value is a plain object (excluding null and arrays).
   */
  function isObject(value: unknown): value is Record<string, unknown>;

  /**
   * Checks if the given value is numeric (number or numeric string).
   */
  function isNumeric(value: unknown): value is number | `${number}`;

  /**
   * Checks if the given value is an integer.
   */
  function isInteger(value: unknown): value is number;

  /**
   * Checks if the given value is a float.
   */
  function isFloat(value: unknown): value is number;

  /**
   * Checks if the given value is a boolean.
   */
  function isBoolean(value: unknown): value is boolean;

  /**
   * Checks if the given value is null.
   */
  function isNull(value: unknown): value is null;

  /**
   * Checks if the given value is not undefined or null.
   */
  function isset<T>(value: T | null | undefined): value is T;

  /**
   * Checks if the given key exists in the object.
   */
  function keyExist<T extends object>(
    object: T,
    key: string | number | symbol
  ): key is keyof T;

  /**
   * Checks if the given value is undefined.
   */
  function isUndefined<T>(
    value: T | null | undefined
  ): value is Exclude<T, NonNullable<T>>;

  /**
   * Checks if the given value is empty.
   */
  function empty<T>(
    value: T | null | undefined
  ): value is Exclude<T, NonNullable<T>>;

  /**
   * Checks if the given method exists on the given object.
   */
  function methodExist<T extends object>(
    object: T,
    method: string
  ): method is keyof T & string;

  /**
   * Encodes the given data as a JSON string.
   *
   * @param data - The data to encode.
   * @returns A string representing the JSON-encoded version of the data.
   */
  function jsonEncode(data: unknown): string;

  /**
   * Decodes the given JSON string into a JavaScript object or returns the data if it's not a string.
   *
   * @param data - The JSON string to decode.
   * @returns The decoded JavaScript object, or the original data if it is not a string.
   */
  function jsonDecode<T = any>(value: string): Exclude<T, undefined>;

  /**
   * Reads the content of a file synchronously.
   * @param fileString The relative file path from the base path.
   * @returns The file contents as a UTF-8 string. Returns an empty string if reading fails or no path is provided.
   */
  function getFileContents(fileString?: string): string;

  /**
   * Converts a path file to UInt8Array.
   * @param fileString The relative file path from the base path.
   * @returns The file contents as a Uint8Array. Returns an empty Uint8Array
   */

  function readFile(fileString: string): Uint8Array;

  /**
   * Version Comparison
   * Compares two version strings and return boolean value.
   * @param version1 - The first version string.
   * @param version2 - The second version string.
   * @param operator - The comparison operator (e.g., '>', '<', '>=', '<=', '==', '!=').
   */
  function versionCompare(
    version1: string,
    version2: string,
    operator: IVersionOperator | IVersionSymbol
  ): boolean | number;

  function moveUploadedFile(
    destination: string,
    arrayBuffer: ArrayBuffer
  ): true | false;

  /**
   * Returns the first element of an array.
   * If the array is empty, `null` is returned.
   */
  function arrayFirst<T>(array: T[]): T | null;

  /**
   * Returns the last element of an array.
   * If the array is empty, `null` is returned.
   */
  function arrayLast<T>(array: T[]): T | null;

  /**
   * Returns the current Deno version as a string.
   */
  function denoVersion(): string;

  /**
   * Returns the current framework and Deno version information.
   */
  function frameworkVersion(): {
    denoVersion: string;
    honovelVersion: string;
  };

  /**
   * Custom console object for logging messages with different severity levels.
   */
  const consoledeno: {
    error: (...msg: any) => void;
    warn: (...msg: any) => void;
    info: (...msg: any) => void;
    success: (...msg: any) => void;
    debug: (...msg: any) => void;
  };

  /**
   * Indicates if the Vite development server is currently running.
   */
  const viteServer: boolean;
}
