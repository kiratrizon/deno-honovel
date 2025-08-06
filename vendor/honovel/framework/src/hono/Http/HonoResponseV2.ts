import { CookieOptions } from "hono/utils/cookie";

export default class HonoResponseV2 {
  protected _headers: Headers = new Headers();
  protected _status = 200;
  protected _body: BodyInit | null = null;
  protected _contentType: string | null = null;

  protected static mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".ts": "application/typescript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".xml": "application/xml",
    ".csv": "text/csv",
    ".wasm": "application/wasm",
  };
  public status(code: number) {
    this._status = code;
    return this;
  }

  public header(key: string, value: string) {
    this._headers.set(key, value);
    return this;
  }

  public json(data: unknown, status = 200) {
    this._body = JSON.stringify(data);
    this._contentType = "application/json";
    this._status = status;
    return new JSONResponse(
      this._body,
      this._contentType,
      this._headers,
      this._status
    );
  }

  public html(html: string, status = 200) {
    this._body = html;
    this._contentType = "text/html";
    this._status = status;
    return new HTMLResponse(
      this._body,
      this._contentType,
      this._headers,
      this._status
    );
  }

  public file(data: Uint8Array | string, contentType?: string) {
    if (isString(data)) {
      const filename = data;
      data = readFile(data);
      if (!contentType) {
        contentType = HonoResponseV2.guessMimeType(filename);
      }
    }
    if (!isset(contentType)) {
      contentType = "application/octet-stream"; // Default if not provided
    }
    if (!(data instanceof Uint8Array)) {
      throw new Error("Data must be a Uint8Array or a valid file path.");
    }
    this._body = data;
    this._contentType = contentType;
    this._headers.set("Content-Length", data.byteLength.toString());
    return new FileResponse(
      this._body,
      this._contentType,
      this._headers,
      this._status
    );
  }

  public download(data: Uint8Array | string, filename = "download.dat") {
    if (isString(data)) {
      data = readFile(data);
    }
    if (!(data instanceof Uint8Array)) {
      throw new Error("Data must be a Uint8Array or a valid file path.");
    }
    this._body = data;
    this._contentType = "application/octet-stream";
    this._headers.set(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    this._headers.set("Content-Length", data.byteLength.toString());
    return new DownloadResponse(
      this._body,
      this._contentType,
      this._headers,
      this._status
    );
  }

  public stream(path: string, contentType?: string) {
    const file = Deno.openSync(path, { read: true });

    if (!contentType) {
      contentType = HonoResponseV2.guessMimeType(path);
    }

    this._body = file.readable;
    this._contentType = contentType;

    return new FileResponse(
      this._body,
      this._contentType,
      this._headers,
      this._status
    );
  }

  private static guessMimeType(filename: string): string {
    const ext = "." + filename.split(".").pop()?.toLowerCase();
    return this.mimeTypes[ext] || "application/octet-stream";
  }
}

export class HonoResponse {
  protected cookies: Record<string, [string, CookieOptions]> = {};
  constructor(
    protected body: BodyInit | null,
    protected contentType: string | null,
    protected headers: Headers,
    protected status: number
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

  public cookie(
    name: string,
    value: string,
    options: CookieOptions = {}
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

  protected toResponse(additionalHeaders: Headers): Response {
    for (const [key, value] of additionalHeaders.entries()) {
      if (!this.headers.has(key)) {
        this.headers.set(key, value);
      }
    }

    return new Response(this.body, {
      status: this.status,
      headers: this.headers,
    });
  }

  protected getCookies() {
    return this.cookies;
  }
}

export class JSONResponse extends HonoResponse {}

export class HTMLResponse extends HonoResponse {}

export class FileResponse extends HonoResponse {}

export class DownloadResponse extends HonoResponse {}
