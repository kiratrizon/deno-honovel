export interface HttpHeaders extends NodeJS.Dict<string | string[]> {
  accept?: string | undefined;
  "accept-encoding"?: string | undefined;
  "accept-language"?: string | undefined;
  "accept-patch"?: string | undefined;
  "accept-ranges"?: string | undefined;
  "access-control-allow-credentials"?: string | undefined;
  "access-control-allow-headers"?: string | undefined;
  "access-control-allow-methods"?: string | undefined;
  "access-control-allow-origin"?: string | undefined;
  "access-control-expose-headers"?: string | undefined;
  "access-control-max-age"?: string | undefined;
  "access-control-request-headers"?: string | undefined;
  "access-control-request-method"?: string | undefined;
  age?: string | undefined;
  allow?: string | undefined;
  "alt-svc"?: string | undefined;
  authorization?: string | undefined;
  "cache-control"?: string | undefined;
  connection?: string | undefined;
  "content-disposition"?: string | undefined;
  "content-encoding"?: string | undefined;
  "content-language"?: string | undefined;
  "content-length"?: string | undefined;
  "content-location"?: string | undefined;
  "content-range"?: string | undefined;
  "content-type"?: string | undefined;
  cookie?: string | undefined;
  date?: string | undefined;
  etag?: string | undefined;
  expect?: string | undefined;
  expires?: string | undefined;
  forwarded?: string | undefined;
  from?: string | undefined;
  host?: string | undefined;
  "if-match"?: string | undefined;
  "if-modified-since"?: string | undefined;
  "if-none-match"?: string | undefined;
  "if-unmodified-since"?: string | undefined;
  "last-modified"?: string | undefined;
  location?: string | undefined;
  origin?: string | undefined;
  pragma?: string | undefined;
  "proxy-authenticate"?: string | undefined;
  "proxy-authorization"?: string | undefined;
  "public-key-pins"?: string | undefined;
  range?: string | undefined;
  referer?: string | undefined;
  "retry-after"?: string | undefined;
  "sec-websocket-accept"?: string | undefined;
  "sec-websocket-extensions"?: string | undefined;
  "sec-websocket-key"?: string | undefined;
  "sec-websocket-protocol"?: string | undefined;
  "sec-websocket-version"?: string | undefined;
  "set-cookie"?: string[] | undefined;
  "strict-transport-security"?: string | undefined;
  tk?: string | undefined;
  trailer?: string | undefined;
  "transfer-encoding"?: string | undefined;
  upgrade?: string | undefined;
  "user-agent"?: string | undefined;
  vary?: string | undefined;
  via?: string | undefined;
  warning?: string | undefined;
  "www-authenticate"?: string | undefined;
}
import IHonoHeader from "../../../../@types/declaration/IHonoHeader.d.ts";

class HonoHeader implements IHonoHeader {
  #c: MyContext;

  #rawHeaders: HttpHeaders | undefined;
  constructor(c: MyContext) {
    this.#c = c;
  }

  private getRawHeaders() {
    if (!this.#rawHeaders) {
      this.#rawHeaders = this.#c.req.header();
    }
    return this.#rawHeaders;
  }

  all(): HttpHeaders {
    const headers = this.getRawHeaders();
    const normalized: HttpHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        normalized[key.toLowerCase()] = value;
      }
    }
    return normalized;
  }

  get(key: string): string | null {
    const headers = this.getRawHeaders();
    const value = headers[key.toLowerCase()];
    if (!value) return null;
    if (isArray(value)) {
      return value.length > 0 ? value[0] : null;
    }
    return value;
  }

  set(key: string, value: string): void {
    const headers = this.getRawHeaders();
    headers[key.toLowerCase()] = value;
    this.#c.req.raw.headers.set(key, value);
  }

  has(key: string): boolean {
    const headers = this.getRawHeaders();
    const value = headers[key.toLowerCase()];
    return value !== undefined && value !== null;
  }

  contentType(): string | null {
    return this.get("content-type");
  }

  acceptLanguage(): string | null {
    return this.get("accept-language");
  }

  authorization(): string | null {
    return this.get("authorization");
  }
}

export default HonoHeader;
