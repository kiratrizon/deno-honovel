import IHonoHeader from "./IHonoHeader.d.ts";
import { IncomingHttpHeaders } from "node:http";
import { SessionContract } from "./ISession.d.ts";
import { CookieOptions } from "hono/utils/cookie";

export type RequestMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD"
  | "CONNECT"
  | "TRACE";
export interface RequestData {
  method?: RequestMethod;
  headers: IncomingHttpHeaders;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  rawQuery?: string; // raw query string after '?'
  cookies: Record<string, unknown>;
  cookieHeader?: string; // raw cookie header string
  path?: string;
  originalUrl?: string;
  ip?: string;
  protocol?: string;
  userAgent?: string;
  timestamp?: number; // request time (ms since epoch)
  files: Record<string, File[]>;
  server: SERVER;
  params: Record<string, string | null>;
}

/**
 * Interface that defines the structure of server-related information in an HTTP request.
 * This includes details about the server, client, request method, headers, and more.
 */
export interface SERVER {
  // [key: string]: string | number | null;
  /**
   * The name of the server (e.g., 'localhost' or the domain name).
   */
  SERVER_NAME: string;

  /**
   * The IP address of the server.
   */
  SERVER_ADDR: string;

  /**
   * The port number on which the server is listening for requests.
   */
  SERVER_PORT: string;

  /**
   * The protocol used in the request (e.g., 'http' or 'https').
   */
  SERVER_PROTOCOL: string;

  /**
   * The HTTP method of the request (e.g., 'GET', 'POST').
   */
  REQUEST_METHOD: string;

  /**
   * The query string part of the URL (if present).
   */
  QUERY_STRING: string;

  /**
   * The full request URI, including path and query string.
   */
  REQUEST_URI: string;

  /**
   * The document root of the server.
   */
  DOCUMENT_ROOT: string;

  /**
   * The User-Agent string sent by the client, describing the browser or client making the request.
   */
  HTTP_USER_AGENT: string;

  /**
   * The referer URL, if any, from which the request was made.
   */
  HTTP_REFERER: string;

  /**
   * The IP address of the client making the request.
   */
  REMOTE_ADDR: string;

  /**
   * The port number of the client making the request.
   */
  REMOTE_PORT: string;

  /**
   * The path part of the request URL (e.g., '/path/to/resource').
   */
  SCRIPT_NAME: string;

  /**
   * The HTTPS status, indicating whether the connection is secure ('on') or not ('off').
   */
  HTTPS: string;

  /**
   * The protocol forwarded by any reverse proxies, such as 'https' or 'http'.
   */
  HTTP_X_FORWARDED_PROTO: string;

  /**
   * The original IP address of the client as forwarded by any reverse proxy.
   */
  HTTP_X_FORWARDED_FOR: string;

  /**
   * The timestamp of the request in ISO format (e.g., '2025-05-06 12:30:45').
   */
  REQUEST_TIME: string;

  /**
   * The timestamp in milliseconds since the Unix Epoch.
   */
  REQUEST_TIME_FLOAT: number;

  /**
   * The CGI version, typically 'CGI/1.1'.
   */
  GATEWAY_INTERFACE: string;

  /**
   * The server signature, such as 'X-Powered-By: Throy Tower'.
   */
  SERVER_SIGNATURE: string;

  /**
   * The path info of the request.
   */
  PATH_INFO: string;

  /**
   * The 'Accept' header sent by the client, which defines the types of media the client can process.
   */
  HTTP_ACCEPT: string;

  /**
   * A unique request ID generated for tracking purposes. This may be provided in the request headers.
   */
  HTTP_X_REQUEST_ID: string;
}

/**
 * HonoRequest class that encapsulates HTTP request data.
 */
declare class IHonoRequest {
  // start 🔹 Input & Query Parameters

  /**
   * Get all input data (including query string and POST data).
   */
  public all(): Record<string, unknown>;

  /**
   * Get a specific input value by key.
   */
  public input(key: string): unknown;

  // Get only specified input values.
  public only(keys: string[]): Record<string, unknown>;

  // Get all input except specified keys.
  public except(keys: string[]): Record<string, unknown>;

  // Get a query string value.
  public query(key?: string): Record<string, unknown> | unknown;

  // Check if a key exists in input.
  public has(key: string): boolean;

  // Check if a key is present and not empty.
  public filled(key: string): boolean;

  // Cast an input to a boolean.
  public boolean(key: string): boolean;

  // Execute callback if input is present.
  public whenHas(
    key: string,
    callback: (value: unknown) => Promise<unknown>
  ): Promise<unknown>;

  // Execute callback if input has value.
  public whenFilled(
    key: string,
    callback: (value: unknown) => Promise<unknown>
  ): Promise<unknown>;

  // end 🔹 Input & Query Parameters

  // start 🔹 Request Path & Method

  /**
   * Get the request URI path (e.g., posts/1/edit)
   */
  public path(): string;

  /**
   * Get the full URL without query string.
   */
  public url(): string;

  /**
   * Get the request method (GET, POST, etc.).
   */
  public method(): RequestMethod;

  /**
   * Check if method matches.
   */
  public isMethod(method: RequestMethod): boolean;

  /**
   * Check if path matches a pattern.
   */
  public is(pattern: string): boolean;

  // end 🔹 Request Path & Method

  // start 🔹 Headers & Cookies

  /**
   * Get a header value by key.
   */
  public header(key: string): string | null;

  /**
   * IHonoHeader class to manage HTTP headers.
   * It provides an easy interface to retrieve all headers.
   */
  public get headers(): IHonoHeader;

  /**
   * Check if a header exists.
   */
  public hasHeader(key: string): boolean;

  /**
   * Get the bearer token from Authorization header.
   */
  public bearerToken(): string | null;

  /**
   * Set a cookie value with optional configuration.
   * @param key The cookie name.
   * @param value The cookie value, must not be undefined.
   * @param config Optional cookie configuration like maxAge, path, domain, etc.
   */
  public cookie(
    key: string,
    value: Exclude<unknown, undefined>,
    config: CookieOptions
  ): void;

  /**
   * Get a specific cookie value by key.
   */
  public cookie(key: string): Exclude<unknown, undefined>;

  /**
   * Get all cookies as a key-value map.
   */
  public cookie(): Record<string, Exclude<unknown, undefined>>;
  // start 🔹 Files & Uploaded Content

  /**
   * Get all uploaded files.
   */
  public allFiles(): Record<string, unknown>;
  /**
   * Get a specific uploaded file by key.
   */
  public file(key: string): unknown;
  /**
   * Check if a file exists in the request.
   */
  public hasFile(key: string): boolean;

  // end 🔹 Files & Uploaded Content

  // start 🔹 Server & Environment Info
  /**
   * Get the request IP address.
   */
  public ip(): string;

  /**
   * Get all IPs from headers.
   */
  public ips(): string[];

  /**
   * Get user agent string.
   */
  public userAgent(): string;

  /**
   * Get server variable.
   */
  public server(key?: keyof SERVER): SERVER | string | number | null;

  /**
   * Get the host name.
   */
  public getHost(): string;

  /**
   * Get the port
   */
  public getPort(): number;

  // end 🔹 Server & Environment Info

  // start 🔹 Session & Auth
  /**
   * Get authenticated user.
   */
  public user(): Promise<Record<string, unknown> | null>;

  // end 🔹 Session & Auth

  // start 🔹 JSON Requests
  /**
   * Check if the request is JSON.
   */
  public isJson(): boolean;
  /**
   * Get the JSON from key.
   */
  public json(key: string): unknown;

  /**
   * Check if response should be JSON.
   */
  public expectsJson(): boolean;

  // end 🔹 JSON Requests

  // start 🔹 Route param
  /**
   * Get a route parameter by key.
   */
  public route(key?: string): string | null | Record<string, string | null>;
  // end 🔹 Route param

  /**
   * Check if request is from a mobile device.
   */
  public isMobile(): boolean;

  /**
   * Check if request is from a bot.
   */
  public isBot(): boolean;

  /**
   * Determine if it is an AJAX request.
   */
  public ajax(): boolean;

  // start 🔹 Miscellaneous
  public session(): SessionContract;
}

export default IHonoRequest;
