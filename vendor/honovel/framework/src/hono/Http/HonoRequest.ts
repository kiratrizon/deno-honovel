import { CookieOptions } from "hono/utils/cookie";
import IHonoHeader from "../../@hono-types/declaration/IHonoHeader.d.ts";
import IHonoRequest, {
  RequestData,
  RequestMethod,
  SERVER,
} from "../../@hono-types/declaration/IHonoRequest.d.ts";
import { SessionContract } from "../../@hono-types/declaration/ISession.d.ts";
import HonoHeader from "./HonoHeader.ts";
import { isbot } from "isbot";

class HonoRequest implements IHonoRequest {
  private raw: RequestData;
  private myAll: Record<string, unknown> = {};
  #sessionInstance: SessionContract;
  #myCookie: Record<string, [string, CookieOptions]> = {};
  constructor(req: RequestData, sessionInstance: SessionContract) {
    this.raw = req;
    this.myAll = {
      ...req.query,
      ...req.body,
    };
    this.#sessionInstance = sessionInstance;
  }

  public all(): Record<string, unknown> {
    return this.myAll;
  }

  public input(key: string): unknown {
    return this.myAll[key] || null;
  }

  public only(keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = only(this.myAll, keys);
    return result;
  }

  public except(keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = except(this.myAll, keys);
    return result;
  }

  public query(key: string) {
    if (isset(key)) {
      return (this.raw.query![key] as unknown) || null;
    }
    return this.raw.query as Record<string, unknown>;
  }

  public has(key: string): boolean {
    return keyExist(this.myAll, key);
  }
  public filled(key: string): boolean {
    return isset(this.myAll[key]) && !empty(this.myAll[key]);
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
      const value = this.input(key) || null;
      return (await callback(value)) || null;
    }
    return null;
  }

  public async whenFilled(
    key: string,
    callback: (value: unknown) => Promise<unknown>
  ) {
    if (this.filled(key)) {
      const value = this.input(key);
      return (await callback(value)) || null;
    }
    return null;
  }

  public path(): string {
    return this.raw.path || "";
  }

  public url(): string {
    return this.raw.originalUrl || "";
  }

  public method(): RequestMethod {
    return this.raw.method as RequestMethod;
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
    if (keyExist(this.raw.headers, key) && isset(this.raw.headers[key])) {
      return this.raw.headers[key] as string;
    }
    return null;
  }

  public get headers(): IHonoHeader {
    const headers = new HonoHeader(this.raw.headers);
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

  public cookie(
    key: string,
    value: Exclude<unknown, undefined>,
    config: CookieOptions
  ): void;
  public cookie(key: string): Exclude<unknown, undefined>;
  public cookie(): Record<string, Exclude<unknown, undefined>>;
  public cookie(
    key?: string,
    value?: Exclude<unknown, undefined>,
    config?: CookieOptions
  ): unknown {
    if (isString(key) && key === "sid") {
      throw new Error(
        `The 'sid' cookie is reserved for session management and cannot be set directly.`
      );
    }
    if (isset(key) && isset(value) && isString(key)) {
      this.#myCookie[key] = [jsonEncode(value), config || {}];
      return;
    }
    if (isString(key) && !isset(value)) {
      if (keyExist(this.#myCookie, key) && isset(this.#myCookie[key])) {
        return jsonDecode(this.#myCookie[key][0]);
      } else if (keyExist(this.raw.cookies, key)) {
        return this.raw.cookies[key];
      }
    }
    if (!isset(key)) {
      const fromMyCookie: Record<
        string,
        Exclude<unknown, undefined>
      > = Object.entries(this.#myCookie).reduce((acc, [k, v]) => {
        acc[k] = jsonDecode(v[0]);
        return acc;
      }, {} as Record<string, Exclude<unknown, undefined>>);
      return {
        ...this.raw.cookies,
        ...fromMyCookie,
      };
    }
    return null;
  }

  public allFiles(): Record<string, unknown> {
    return this.raw.files;
  }
  public file(key: string): unknown {
    if (keyExist(this.raw.files, key) && isset(this.raw.files[key])) {
      return this.raw.files[key] as unknown;
    }
    return null;
  }
  public hasFile(key: string): boolean {
    return keyExist(this.raw.files, key) && isset(this.raw.files[key]);
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
      return this.raw.server[key] || null;
    }
    return this.raw.server;
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
      return this.input(key) || null;
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
      keyExist(this.raw.params, key) &&
      isset(this.raw.params[key])
    ) {
      return this.raw.params[key];
    } else if (!isset(key)) {
      return this.raw.params;
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

  public session(): SessionContract {
    return this.#sessionInstance;
  }
}

export default HonoRequest;
