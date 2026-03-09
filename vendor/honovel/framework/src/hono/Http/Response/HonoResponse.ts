import { CookieOptions } from "hono/utils/cookie";

export default class HonoResponse {
  protected cookies: Record<string, [string, CookieOptions]> = {};
  constructor(
    protected body: BodyInit | null,
    protected contentType: string | null,
    protected headers: Headers,
    protected status: number,
  ) {
    if (this.contentType) {
      this.headers.set("Content-Type", this.contentType);
    }
  }

  public withHeaders(extra: Record<string, string>): this {
    for (const [key, value] of Object.entries(extra)) {
      this.headers.set(key, value);
    }
    return this;
  }

  public header(key: string, value: string): this {
    this.headers.set(key, value);
    return this;
  }

  public cookie(
    name: string,
    value: string,
    options: CookieOptions = {},
  ): this {
    this.cookies[name] = [value, options];
    return this;
  }

  public clearCookie(name: string, path = "/"): this {
    return this.cookie(name, "", {
      path,
      expires: new Date(0),
    });
  }

  protected toResponse(): Response {
    return new Response(this.body, {
      status: this.status,
      headers: this.headers,
    });
  }

  protected getCookies() {
    return this.cookies;
  }
}
