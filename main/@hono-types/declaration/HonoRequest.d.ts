import HonoHeader from "./HonoHeader.d.ts";
import { IncomingHttpHeaders } from "http";

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
export interface RequestData {
  method: RequestMethod;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  cookies: Record<string, unknown>;
  path: string;
  originalUrl: string;
  ip: string;
  protocol: string;
  files: Record<string, unknown>;
}

/**
 * HonoRequest class that encapsulates HTTP request data.
 */
declare class HonoRequest {
  private requestData: RequestData;
  constructor(rq: RequestData);

  // start 🔹 Input & Query Parameters

  /**
   * Get all input data (including query string and POST data).
   */
  public all(): Record<string, unknown>;

  /**
   * Get a specific input value by key.
   */
  public input(key: string): unknown;

  /**
   * Get all input values as an object.
   */
  public inputs: Record<string, unknown>;

  // Get only specified input values.
  public only(keys: string[]): Record<string, unknown>;

  // Get all input except specified keys.
  public except(keys: string[]): Record<string, unknown>;

  // Get a query string value.
  public query(key: string): unknown;

  /**
   * Get all query string values as an object.
   */
  public queries: Record<string, unknown>;

  // Check if a key exists in input.
  public has(key: string): boolean;

  // Check if a key is present and not empty.
  public filled(key: string): boolean;

  // Cast an input to a boolean.
  public boolean(key: string): boolean;

  // Execute callback if input is present.
  public whenHas(key: string, callback: (value: unknown) => void): void;

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
   * Get the full URL with query string.
   */
  public fullUrl(): string;

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

  /**
   * Check if current route name matches.
   */
  public routeIs(name: string): boolean;

  // end 🔹 Request Path & Method

  // start 🔹 Headers & Cookies

  /**
   * Get a header value by key.
   */
  public header(key: string): string | null;

  /**
   * HonoHeader class to manage HTTP headers.
   * It provides an easy interface to retrieve all headers.
   */
  public headers: HonoHeader;

  /**
   * Check if a header exists.
   */
  public hasHeader(key: string): boolean;

  /**
   * Get the bearer token from Authorization header.
   */
  public bearerToken(): string | null;

  /**
   * Get a cookie value.
   */
  public cookie(key: string): string | null;

  // start 🔹 Files & Uploaded Content

  /**
   * Get all uploaded files.
   */
  public files: Record<string, unknown>;
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
  public userAgent(): string | null;

  /**
   * Get server variable.
   */
  public server(key: string): string | null;

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
}

export default HonoRequest;
