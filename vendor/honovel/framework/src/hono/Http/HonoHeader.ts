import { IncomingHttpHeaders } from "node:http";
import IHonoHeader from "../../@hono-types/declaration/IHonoHeader.d.ts";

class HonoHeader implements IHonoHeader {
  private headers: IncomingHttpHeaders;

  constructor(headers: IncomingHttpHeaders) {
    this.headers = headers || {};
  }

  all(): IncomingHttpHeaders {
    return this.headers;
  }

  get(key: string): string | null {
    const value = this.headers[key.toLowerCase()];
    if (!value) return null;
    if (isArray(value)) {
      return value.length > 0 ? value[0] : null;
    }
    return value;
  }

  has(key: string): boolean {
    const value = this.headers[key.toLowerCase()];
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
