type FlashData = Record<string, unknown>;

export default class Redirect {
  private url: string = "/";
  private flashData: FlashData = {};
  #back: boolean = false;

  to(url: string): this {
    this.url = url;
    return this;
  }

  back(): this {
    this.url = this.getPreviousUrl() ?? "/";
    return this;
  }

  with(key: string, value: unknown): this {
    this.flashData[key] = value;
    return this;
  }

  withData(data: FlashData): this {
    this.flashData = { ...this.flashData, ...data };
    return this;
  }

  route(name: string, params: Record<string, string | number> = {}): this {
    const resolvedUrl = this.resolveRoute(name, params);
    return this.to(resolvedUrl);
  }

  getResponse(): Response {
    const headers = new Headers();
    headers.set("Location", this.url);
    // Assuming flash data is handled through cookies or session in middleware
    return new Response(null, {
      status: 302,
      headers,
    });
  }

  private getPreviousUrl(): string | null {
    // You can inject this value from request context or referer header
    return "/previous"; // placeholder
  }

  private resolveRoute(
    name: string,
    params: Record<string, string | number>
  ): string {
    // Implement route resolving logic based on your framework
    // Example: route("user.profile", { id: 1 }) -> "/users/1"
    return `/route/${name}`; // placeholder
  }
}

// Shortcut function
export function redirect(): Redirect {
  return new Redirect();
}
