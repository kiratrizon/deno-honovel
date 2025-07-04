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
import { myProtectedCookieKeys } from "./HonoCookie.ts";
import { FormFile } from "https://deno.land/x/multiparser@0.114.0/mod.ts";

class HonoRequest extends Macroable implements IHonoRequest {
  #c: MyContext;
  #raw: RequestData;
  #myAll: Record<string, unknown> = {};
  #session: ISession;
  constructor(c: MyContext, req: RequestData) {
    super();
    this.#c = c;
    (this.constructor as typeof HonoRequest).applyMacrosTo(this);
    this.#raw = req;
    this.#myAll = {
      ...req.query,
      ...req.body,
    };
    const session = this.#c.get("session") as ISession;
    this.#session = session;
  }

  public all(): Record<string, unknown> {
    return this.#myAll;
  }

  public input(key: string): unknown {
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

  public query(key: string) {
    if (isset(key)) {
      return (this.#raw.query![key] as unknown) ?? null;
    }
    return this.#raw.query as Record<string, unknown>;
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
    return this.#raw.path || "";
  }

  public url(): string {
    return this.#raw.originalUrl || "";
  }

  public method(): RequestMethod {
    return this.#raw.method as RequestMethod;
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
    if (keyExist(this.#raw.headers, key) && isset(this.#raw.headers[key])) {
      return this.#raw.headers[key] as string;
    }
    return null;
  }

  public get headers(): IHonoHeader {
    const headers = new HonoHeader(this.#raw.headers);
    return headers;
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
  public cookie(key?: string): unknown {
    const protectedCookieKeys = myProtectedCookieKeys();
    if (isString(key) && protectedCookieKeys.includes(key)) {
      // Do not allow setting or getting protected cookies
      return null;
    }
    if (isString(key) && keyExist(this.#raw.cookies, key)) {
      return this.#raw.cookies[key];
    }
    return null;
  }

  public allFiles(): Record<string, FormFile[]> {
    return this.#raw.files;
  }
  public file(key: string): FormFile[] | null {
    if (keyExist(this.#raw.files, key) && isset(this.#raw.files[key])) {
      return this.#raw.files[key] as FormFile[];
    }
    return null;
  }
  public hasFile(key: string): boolean {
    return keyExist(this.#raw.files, key) && isset(this.#raw.files[key]);
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
    if (isset(key)) {
      return this.#raw.server[key] ?? null;
    }
    return this.#raw.server;
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

  public json(key: string): unknown {
    if (this.isJson()) {
      return this.input(key) ?? null;
    }
    return null;
  }
  public expectsJson(): boolean {
    const acceptHeader = this.header("accept");
    if (acceptHeader) {
      return acceptHeader.includes("application/json");
    }
    return false;
  }

  public route(key: string) {
    if (
      isset(key) &&
      keyExist(this.#raw.params, key) &&
      isset(this.#raw.params[key])
    ) {
      return this.#raw.params[key];
    } else if (!isset(key)) {
      return this.#raw.params;
    }
    return null;
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

  public session(): ISession {
    return this.#session;
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

  private resetRoute(params = {}): void {
    this.#raw.params = params;
  }
}

export default HonoRequest;
