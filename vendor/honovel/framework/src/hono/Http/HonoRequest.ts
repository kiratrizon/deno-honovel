import { RequestMethod, SERVER } from "./HonoRequest.d.ts";
import HonoHeader from "./HonoHeader.ts";
import { isbot } from "isbot";
import Macroable from "../../Maneuver/Macroable.ts";
import { Validator } from "Illuminate/Support/Facades/index.ts";
import { getMyCookie, setMyCookie } from "./HonoCookie.ts";
import { multiParser, FormFile } from "multiParser2";

import { CookieOptions } from "hono/utils/cookie";
import { deleteCookie } from "hono/cookie";
import { SessionModifier } from "HonoHttp/HonoSession.ts";
import { Authenticatable } from "Illuminate/Contracts/Auth/index.ts";
import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { ModelAttributes } from "../../../../@types/declaration/Base/IBaseModel.d.ts";
import { ValidationException } from "Illuminate/Validation/ValidationException.ts";
import HonoFile from "./HonoFile.ts";

import { XMLParser } from "fast-xml-parser";

class HonoRequest extends Macroable {
  public static HEADER_X_FORWARDED_ALL = [
    "X-Forwarded-For",
    "X-Forwarded-Proto",
    "X-Forwarded-Host",
    "X-Forwarded-Port",
  ];

  #c: MyContext;
  #files: Record<string, HonoFile[]> = {};
  #myAll: Record<string, unknown> = {};
  #myHeader: HonoHeader;
  #routeParams: Record<string, string | null> = {};
  #built: boolean = false;
  #sessionMod: SessionModifier;
  readonly #bindedModels: Record<string, typeof Model<ModelAttributes>> = {};
  // @ts-ignore //
  #server: SERVER = {};
  constructor(c: MyContext) {
    super();
    this.#c = c;
    (this.constructor as typeof HonoRequest).applyMacrosTo(this);
    this.#myHeader = new HonoHeader(this.#c);
    this.#sessionMod = new SessionModifier(this.#c);
  }

  public async buildRequest() {
    if (this.#built) {
      return;
    }
    const c = this.#c;
    const files: Record<string, HonoFile[]> = {};
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
            const fileToObj = Array.isArray(file)
              ? file.map((e) => {
                  return new HonoFile(e);
                })
              : [new HonoFile(file)];
            files[key] = fileToObj;
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
    } else if (contentType.includes("application/xml")) {
      const text = await c.req.text();
      // parse text
      const parser = new XMLParser();
      try {
        const parsed = parser.parse(text);
        body = parsed;
      } catch {
        abort(400, "Invalid XML format");
      }
    } else {
      switch (c.req.method.toUpperCase()) {
        case "GET":
        case "DELETE":
        case "HEAD":
          body = c.req.query() || {};
          break;
        case "POST":
        case "PUT":
        case "PATCH":
          try {
            body = await c.req.json();
          } catch {
            body = {};
          }
          break;
        default:
          body = {};
          break;
      }
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

  public clean(data: Record<string, unknown>) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      cleaned[key] = value === "" ? null : value;
    }
    return cleaned;
  }

  public merge(data: Record<string, unknown>): void {
    if (!this.#built) {
      throw new Error("Request not built yet. Call buildRequest() first.");
    }
    this.#myAll = { ...this.#myAll, ...this.clean(data) };
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

  public only<K extends readonly string[]>(
    keys: K
  ): Pick<Record<string, unknown>, K[number]> {
    const result: Record<string, unknown> = only(this.#myAll, [...keys]);
    return result as Pick<Record<string, unknown>, K[number]>;
  }

  public except(keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = except(this.#myAll, keys);
    return result;
  }

  // GET Data
  public query(): Record<string, unknown>;
  public query(key: string): unknown | null;
  public query(key?: string): unknown | null | Record<string, unknown> {
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

  public get url(): string {
    return this.#c.req.url || "";
  }

  public get method(): RequestMethod {
    return this.#c.req.method.toUpperCase() as RequestMethod;
  }

  public isMethod(method: RequestMethod): boolean {
    return this.method === method;
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

  public cookie(key: string): unknown {
    const Cookie = this.#c.get("myHono").Cookie;
    return Cookie.get(key);
  }

  public deleteCookie(key: string, options?: CookieOptions): void {
    const opts =
      isset(options) && !empty(options) && isObject(options) ? options : {};
    deleteCookie(this.#c, key, opts);
  }

  public allFiles(): Record<string, HonoFile[]> {
    return this.#files;
  }

  public file(key: string): HonoFile | null {
    if (keyExist(this.#files, key) && isset(this.#files[key])) {
      return this.#files[key][0] ?? null;
    }
    return null;
  }

  public files(key: string): HonoFile[] | null {
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

  public user(): Authenticatable | null {
    return this.#c.get("auth_user") || null;
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

  public flash(): void {
    if (!empty(this.input())) {
      this.session.flash("_old_input", this.input());
    }
  }

  #variables: Record<string, unknown> = {};

  public set(key: string | Record<string, unknown>, value?: unknown): void {
    if (isString(key) && isset(value)) {
      this.#variables[key] = value;
    } else if (isObject(key)) {
      Object.assign(this.#variables, key);
    }
  }

  public get(key: string): unknown {
    return this.#variables[key] ?? null;
  }

  public get $_SESSION() {
    // @ts-ignore //
    return this.#c.get("session").values;
  }

  public get $_COOKIE() {
    const Cookie = this.#c.get("myHono").Cookie;
    return Cookie.all();
  }

  public get $_SERVER(): SERVER {
    return this.#server;
  }

  public get $_FILES(): Record<string, HonoFile[]> {
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
    return this.#myAll;
  }

  public async sessionStart(): Promise<void> {
    await this.#sessionMod.start();
  }

  public async sessionEnd(): Promise<void> {
    await this.#sessionMod.end();
  }

  public async dispose(): Promise<void> {
    // @ts-ignore //
    const sessionValue = this.#c.get("session").values;
    await this.#sessionMod.dispose(sessionValue);
  }

  public async validate<T extends Record<string, string>>(
    validations: T
  ): Promise<Record<keyof T, string>>;
  public async validate<T extends Record<string, string>>(
    validations: T
  ): Promise<Record<keyof T | string, string>> {
    const data = this.method == "GET" ? this.query() : this.input();
    const validation = await Validator.make(data, validations);

    if (validation.fails()) {
      const errors = validation.getErrors();
      const valExc = new ValidationException(errors);
      let action;
      if (this.ajax() || this.expectsJson()) {
        action = response().json({
          message: "The given data was invalid.",
          errors: errors,
          input: data,
        });
      } else {
        this.session.flash("errors", errors);
        action = redirect().back();
      }
      valExc.setDefaultResponse(action);
      throw valExc;
    }

    return this.only(Object.keys(validations)) as Record<
      keyof T | string,
      string
    >;
  }

  protected resetRoute(params = {}): void {
    this.#routeParams = params;
  }

  public bindRoute(params: Record<string, typeof Model<ModelAttributes>>) {
    Object.assign(this.#bindedModels, params);
  }

  get bindedModels(): Record<string, typeof Model<ModelAttributes>> {
    return this.#bindedModels;
  }
}

export default HonoRequest;
