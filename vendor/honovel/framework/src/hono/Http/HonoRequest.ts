import IHonoHeader from "../../../../@types/declaration/IHonoHeader.d.ts";
import IHonoRequest, {
  RequestData,
  RequestMethod,
  SERVER,
} from "../../../../@types/declaration/IHonoRequest.d.ts";
import { ISession } from "../../../../@types/declaration/ISession.d.ts";
import HonoHeader from "./HonoHeader.ts";
import { isbot } from "isbot";
import Macroable from "../../Maneuver/Macroable.ts";
import { Validator } from "Illuminate/Support/Facades";
import { getMyCookie, setMyCookie } from "./HonoCookie.ts";
import { FormFile } from "https://deno.land/x/multiparser@0.114.0/mod.ts";
import { multiParser } from "https://deno.land/x/multiparser@0.114.0/lib/multiParserV2.ts";

import { CookieOptions } from "hono/utils/cookie";
import { deleteCookie } from "hono/cookie";
import { SessionModifier } from "./HonoSession.ts";

class HonoRequest extends Macroable {
  #c: MyContext;
  #files: Record<string, FormFile[]> = {};
  #myAll: Record<string, unknown> = {};
  #myHeader: HonoHeader;
  #routeParams: Record<string, string | null> = {};
  #built: boolean = false;
  #sessionMod: SessionModifier;
  // @ts-ignore //
  #server: SERVER = {};
  constructor(c: MyContext) {
    super();
    this.#c = c;
    (this.constructor as typeof HonoRequest).applyMacrosTo(this);
    this.#myHeader = new HonoHeader(this.#c);
    this.#sessionMod = new SessionModifier(this.#c);
  }

  protected async buildRequest() {
    if (this.#built) {
      return;
    }
    const c = this.#c;
    const files: Record<string, FormFile[]> = {};
    let body: Record<string, unknown> = {};
    const contentType = (c.req.header("content-type") || "").toLowerCase();
    if (contentType.includes("multipart/form-data")) {
      const parsed = await multiParser(c.req.raw);

      if (parsed) {
        // Get only fields
        body = parsed.fields ?? {};

        // Store files if needed
        if (parsed.files) {
          for (const [key, file] of Object.entries(parsed.files)) {
            // multiparser supports both single and multiple files
            files[key] = Array.isArray(file) ? file : [file];
          }
        }
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await c.req.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => {
        if (body[key]) {
          if (isArray(body[key])) {
            (body[key] as string[]).push(value);
          } else {
            body[key] = [body[key] as string, value];
          }
        } else {
          body[key] = value;
        }
      });
    } else if (contentType.includes("application/json")) {
      try {
        body = await c.req.json();
      } catch {
        body = {};
      }
    } else if (contentType.includes("text/plain")) {
      const text = await c.req.text();
      body = { text };
    } else if (contentType.includes("application/octet-stream")) {
      const buffer = await c.req.arrayBuffer();
      body = { buffer }; // you can handle it differently depending on use case
    } else {
      // fallback for unknown or missing content type
      const text = await c.req.text();
      body = { text };
    }
    this.#files = files;
    this.#myAll = body;

    const params = { ...this.#c.get("subdomain"), ...this.#c.req.param() };
    this.#routeParams = params;

    // for server data
    const toStr = (val: string | string[] | undefined): string =>
      Array.isArray(val) ? val.join(", ") : (val || "unknown").toString();
    const req = c.req;
    const url = new URL(req.url);

    const forServer: SERVER = {
      SERVER_NAME: c.req.header("host")?.split(":")[0] || "unknown",
      SERVER_ADDR: "unknown", // Not available directly
      SERVER_PORT: c.req.header("host")?.split(":")[1] || "unknown", // Not available directly
      SERVER_PROTOCOL: url.protocol.replace(":", "") || "http",
      REQUEST_METHOD: c.req.method,
      QUERY_STRING: url.searchParams.toString() || "",
      REQUEST_URI: url.pathname + url.search,
      DOCUMENT_ROOT: basePath?.() || "unknown",
      HTTP_USER_AGENT: toStr(c.req.header("user-agent")),
      HTTP_REFERER: toStr(c.req.header("referer")),
      REMOTE_ADDR:
        c.req.header("x-forwarded-for")?.split(",")[0].trim() || "unknown",
      REMOTE_PORT: "unknown", // Not available
      SCRIPT_NAME: url.pathname,
      HTTPS: url.protocol === "https:" ? "on" : "off",
      HTTP_X_FORWARDED_PROTO: toStr(c.req.header("x-forwarded-proto")),
      HTTP_X_FORWARDED_FOR: toStr(c.req.header("x-forwarded-for")),
      REQUEST_TIME: date("Y-m-d H:i:s"), // your global function
      REQUEST_TIME_FLOAT: Date.now(),
      GATEWAY_INTERFACE: "CGI/1.1",
      SERVER_SIGNATURE: "X-Powered-By: Throy Tower",
      PATH_INFO: url.pathname,
      HTTP_ACCEPT: toStr(c.req.header("accept")),
      HTTP_X_REQUEST_ID: toStr(
        c.req.header("x-request-id") || this.#generateRequestId()
      ),
    };

    this.#server = forServer;
    this.#built = true;
  }

  #generateRequestId(): string {
    return (
      crypto.randomUUID?.() || "req-" + Math.random().toString(36).slice(2)
    );
  }

  public all(): Record<string, unknown> {
    return this.#myAll;
  }

  // Overloads
  public input(): Record<string, unknown>;
  public input(key: string): unknown | null;

  // Implementation
  public input(key?: string): unknown | null | Record<string, unknown> {
    if (!isset(key)) {
      return this.#myAll;
    }
    return this.#myAll[key] ?? null;
  }


  public only(keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = only(this.#myAll, keys);
    return result;
  }

  public except(keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = except(this.#myAll, keys);
    return result;
  }

  // GET Data
  public query(key?: string) {
    if (isset(key)) {
      return this.#c.req.query(key) ?? null;
    }
    return this.#c.req.query() || {};
  }

  public has(key: string): boolean {
    return keyExist(this.#myAll, key);
  }
  public filled(key: string): boolean {
    return isset(this.#myAll[key]) && !empty(this.#myAll[key]);
  }

  public boolean(key: string): boolean {
    const forTrue = ["1", "true", "yes", "on"];
    const forFalse = ["0", "false", "no", "off"];
    const value = this.input(key);
    if (isArray(value)) {
      return value.some((v) => forTrue.includes(v as string));
    }
    if (isString(value)) {
      if (forTrue.includes(value)) {
        return true;
      } else if (forFalse.includes(value)) {
        return false;
      }
    }
    if (isNumeric(value)) {
      return value !== 0;
    }
    if (isBoolean(value)) {
      return value;
    }
    return false;
  }

  public async whenHas(
    key: string,
    callback: (value: unknown) => Promise<unknown>
  ) {
    if (this.has(key)) {
      const value = this.input(key) ?? null;
      return (await callback(value)) ?? null;
    }
    return null;
  }

  public async whenFilled(
    key: string,
    callback: (value: unknown) => Promise<unknown>
  ) {
    if (this.filled(key)) {
      const value = this.input(key);
      return (await callback(value)) ?? null;
    }
    return null;
  }

  public path(): string {
    return this.#c.req.path || "";
  }

  public url(): string {
    return this.#c.req.url || "";
  }

  public method(): RequestMethod {
    return this.#c.req.method.toUpperCase() as RequestMethod;
  }

  public isMethod(method: RequestMethod): boolean {
    return this.method() === method;
  }

  public is(pattern: string): boolean {
    // Escape special regex chars except '*'
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // escape regex chars
      .replace(/\*/g, ".*"); // replace * with .*

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(this.path());
  }

  public header(key: string): string | null {
    const headers = this.headers.all();
    const value = headers[key.toLowerCase()];
    if (value === undefined || value === null) {
      return null;
    }
    if (isArray(value)) {
      return value.length > 0 ? value[0] : null;
    }
    return value as string;
  }

  public get headers(): HonoHeader {
    return this.#myHeader;
  }

  public hasHeader(key: string): boolean {
    return this.headers.has(key);
  }

  public bearerToken(): string | null {
    const authHeader = this.headers.authorization();
    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
        return parts[1];
      }
    }
    return null;
  }

  public cookie(key: string): Exclude<unknown, undefined>;
  public cookie(): Record<string, Exclude<unknown, undefined>>;
  public cookie(
    key: string,
    value: Exclude<unknown, undefined>,
    options?: CookieOptions
  ): void;
  public cookie(
    key?: string,
    value?: Exclude<unknown, undefined>,
    options?: CookieOptions
  ): unknown {
    if (isset(key) && isset(value)) {
      const newOpts =
        isset(options) && !empty(options) && isObject(options) ? options : {};
      setMyCookie(this.#c, key, value, newOpts);
      return;
    }
    if (isset(key) && !isset(value)) {
      return getMyCookie(this.#c, key);
    }
    if (!isset(key) && !isset(value)) {
      return getMyCookie(this.#c);
    }
  }

  public deleteCookie(key: string, options?: CookieOptions): void {
    const opts =
      isset(options) && !empty(options) && isObject(options) ? options : {};
    deleteCookie(this.#c, key, opts);
  }

  public allFiles(): Record<string, FormFile[]> {
    return this.#files;
  }

  public file(key: string): FormFile[] | null {
    if (keyExist(this.#files, key) && isset(this.#files[key])) {
      return this.#files[key];
    }
    return null;
  }

  public hasFile(key: string): boolean {
    return (
      keyExist(this.#files, key) &&
      isset(this.#files[key]) &&
      this.#files[key].length > 0
    );
  }

  public ip(): string {
    return this.header("x-real-ip") || "unknown";
  }

  public ips(): string[] {
    const xForwardedFor = this.header("x-forwarded-for");
    if (xForwardedFor) {
      return xForwardedFor.split(",").map((ip) => ip.trim());
    }
    return [this.ip()];
  }

  public userAgent(): string {
    return this.header("user-agent") || "";
  }

  public server(key: keyof SERVER): SERVER | string | number | null {
    if (keyExist(this.#server, key)) {
      return this.#server[key] ?? null;
    }
    return null;
  }

  public getHost(): string {
    const host = this.header("host");
    if (host) {
      return host.split(":")[0];
    }
    return "";
  }

  public getPort(): number {
    const host = this.header("host");
    if (host) {
      const parts = host.split(":");
      if (parts.length > 1) {
        return parseInt(parts[1], 10);
      }
    }
    return this.server("SERVER_PORT") as number;
  }

  public async user(): Promise<Record<string, unknown> | null> {
    return null; // Placeholder for user retrieval logic
  }

  public isJson(): boolean {
    const contentType = this.header("content-type");
    if (contentType) {
      return contentType.includes("application/json");
    }
    return false;
  }


  public json(): Record<string, unknown> | null;
  public json(key: string): unknown | null;

  public json(key?: string): unknown | null | Record<string, unknown> {
    if (!this.isJson()) {
      return null;
    }

    if (!isset(key)) {
      return this.#myAll;
    }

    return this.input(key);
  }


  public expectsJson(): boolean {
    const acceptHeader = this.header("accept");
    if (acceptHeader) {
      return acceptHeader.includes("application/json");
    }
    return false;
  }

  public route(key?: string) {
    if (isString(key) && key.length > 0) {
      return this.#routeParams[key] ?? null;
    }
    return this.#routeParams;
  }

  public isBot(): boolean {
    return isbot(this.userAgent());
  }

  public isMobile(): boolean {
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|WPDesktop/i;
    return mobileRegex.test(this.userAgent());
  }

  public ajax(): boolean {
    return this.header("x-requested-with")?.toLowerCase() === "xmlhttprequest";
  }

  public get session() {
    return this.#c.get("session");
  }

  public get $_SESSION() {
    // @ts-ignore //
    return this.#c.get("session").values;
  }

  public get $_COOKIE() {
    // @ts-ignore //
    return getMyCookie(this.#c);
  }

  public get $_SERVER(): SERVER {
    return this.#server;
  }

  public get $_FILES(): Record<string, FormFile[]> {
    return this.#files;
  }

  public get $_REQUEST(): Record<string, unknown> {
    return this.#myAll;
  }

  public get $_GET(): Record<string, unknown> {
    return this.query() as Record<string, unknown>;
  }

  public get $_POST(): Record<string, unknown> {
    if (this.isJson()) {
      return this.json("") as Record<string, unknown>;
    }
    return this.#myAll
  }

  public async sessionStart(): Promise<void> {
    await this.#sessionMod.start();
  }

  public async sessionEnd(): Promise<void> {
    await this.#sessionMod.end();
  }

  public async validate(
    data: Record<string, unknown> = {},
    validations: Record<string, string> = {}
  ): Promise<Record<string, unknown>> {
    const validation = await Validator.make(data, validations);
    if (validation.fails()) {
      throw new Error(`Validation failed: ${validation.getErrors()}`);
    }
    return data;
  }

  protected resetRoute(params = {}): void {
    this.#routeParams = params;
  }
}

export default HonoRequest;
