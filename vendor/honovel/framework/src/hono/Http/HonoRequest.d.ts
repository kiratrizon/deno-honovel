// HonoRequest.d.ts
import {
  RequestMethod,
  SERVER,
} from "../../../../@types/declaration/IHonoRequest.d.ts";
import { ISession } from "../../../../@types/declaration/ISession.d.ts";
import HonoHeader from "./HonoHeader.ts";
import { FormFile } from "multiParser2";
import { CookieOptions } from "hono/utils/cookie";
import { Authenticatable } from "Illuminate/Contracts/Auth/index.ts";
import IHonoHeader from "../../../../@types/declaration/IHonoHeader.d.ts";
import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { ModelAttributes } from "../../../../@types/declaration/Base/IBaseModel.d.ts";

declare class HonoRequest {
  /** Common X-Forwarded headers used for proxies */
  static HEADER_X_FORWARDED_ALL: string[];

  /** Create a new HonoRequest instance with the context */
  constructor(c: MyContext);

  /** Build the request body, files, headers, and server info */
  buildRequest(): Promise<void>;

  /** Clean empty strings into null values */
  clean(data: Record<string, unknown>): Record<string, unknown>;

  /** Merge additional data into the request */
  merge(data: Record<string, unknown>): void;

  /** Get all request data */
  all(): Record<string, unknown>;

  /** Get a value by key or all data if no key */
  input(): Record<string, unknown>;
  input(key: string): unknown | null;

  /** Get only a subset of keys from request data */
  only<K extends readonly string[]>(
    keys: K
  ): Pick<Record<string, unknown>, K[number]>;

  /** Get all request data except specified keys */
  except(keys: string[]): Record<string, unknown>;

  /** Get query parameters or a specific query value */
  query(): Record<string, unknown>;
  query(key: string): unknown | null;

  /** Check if a key exists in request data */
  has(key: string): boolean;

  /** Check if a key is filled with non-empty value */
  filled(key: string): boolean;

  /** Convert a key value to boolean */
  boolean(key: string): boolean;

  /** Execute a callback if a key exists */
  whenHas(
    key: string,
    callback: (value: unknown) => Promise<unknown>
  ): Promise<unknown | null>;

  /** Execute a callback if a key is filled */
  whenFilled(
    key: string,
    callback: (value: unknown) => Promise<unknown>
  ): Promise<unknown | null>;

  /** Get the request path */
  path(): string;

  /** Get the full request URL */
  readonly url: string;

  /** HTTP request method (GET, POST, etc.) */
  readonly method: RequestMethod;

  /** Check if request method matches */
  isMethod(method: RequestMethod): boolean;

  /** Check if request path matches a pattern (supports *) */
  is(pattern: string): boolean;

  /** Get a header value by key */
  header(key: string): string | null;

  /** Access all request headers */
  readonly headers: IHonoHeader;

  /** Check if a header exists */
  hasHeader(key: string): boolean;

  /** Extract Bearer token from Authorization header */
  bearerToken(): string | null;

  /** Get or set cookies */
  cookie(key: string): Exclude<unknown, undefined> | null;

  /** Delete a cookie */
  deleteCookie(key: string, options?: CookieOptions): void;

  /** Get all uploaded files */
  allFiles(): Record<string, FormFile[]>;

  /** Get a file or array of files by key */
  file(key: string): FormFile[] | null;

  /** Check if a file exists by key */
  hasFile(key: string): boolean;

  /** Get the client IP */
  ip(): string;

  /** Get all client IPs, considering X-Forwarded-For */
  ips(): string[];

  /** Get user-agent string */
  userAgent(): string;

  /** Access server variables */
  server(key: keyof SERVER): SERVER | string | number | null;

  /** Get host name */
  getHost(): string;

  /** Get port number */
  getPort(): number;

  /** Get currently authenticated user */
  user(): Authenticatable | null;

  /** Check if request is JSON */
  isJson(): boolean;

  /** Get JSON payload */
  json(): Record<string, unknown> | null;
  json(key: string): unknown | null;

  /** Check if request expects JSON response */
  expectsJson(): boolean;

  /** Get route parameters or a specific param */
  route(): Record<string, string | null>;
  route(key: string): string | null;

  /** Detect bots from user-agent */
  isBot(): boolean;

  /** Detect mobile devices from user-agent */
  isMobile(): boolean;

  /** Check if request is AJAX */
  ajax(): boolean;

  /** Access session instance */
  readonly session: ISession;

  /** Flash data to session */
  flash(key: string, value: unknown): void;

  /** Access session values */
  readonly $_SESSION: Record<string, unknown>;

  /** Access cookies */
  readonly $_COOKIE: Record<string, unknown>;

  /** Access server info */
  readonly $_SERVER: SERVER;

  /** Access uploaded files */
  readonly $_FILES: Record<string, FormFile[]>;

  /** Access request data */
  readonly $_REQUEST: Record<string, unknown>;

  /** GET request data */
  readonly $_GET: Record<string, unknown>;

  /** POST request data */
  readonly $_POST: Record<string, unknown>;

  /** Start session */
  sessionStart(): Promise<void>;

  /** End session */
  sessionEnd(): Promise<void>;

  /** Dispose session */
  dispose(): Promise<void>;

  /** Validate request data with rules */
  validate<T extends Record<string, string>>(
    validations: T
  ): Promise<Record<keyof T | string, string>>;

  /** Bind route parameters to request */
  public bindRoute(params: Record<string, typeof Model<ModelAttributes>>): void;

  /**
   * Set a variable along the request lifecycle
   * Overloaded to accept either a key-value pair or an object of key-value pairs
   * @param key
   * @param value
   */
  public set(key: string, value: unknown): void;
  public set(data: Record<string, unknown>): void;

  /**
   *  Get a variable set along the request lifecycle
   * @param key
   */
  public get(key: string): unknown;
}

export default HonoRequest;
