import { IncomingHttpHeaders } from "node:http";
import IHonoHeader from "../../../../@types/declaration/IHonoHeader.d.ts";

class HonoHeader implements IHonoHeader {
  #c: MyContext;

  #rawHeaders: IncomingHttpHeaders | undefined;
  constructor(c: MyContext) {
    this.#c = c;
  }

  private getRawHeaders() {
    if (!this.#rawHeaders) {
      this.#rawHeaders = this.#c.req.header();
    }
    return this.#rawHeaders;
  }

  all(): IncomingHttpHeaders {
    const headers = this.getRawHeaders();
    const normalized: IncomingHttpHeaders = {};
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
