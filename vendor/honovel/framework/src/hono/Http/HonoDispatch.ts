import { Context } from "hono";
import HonoClosure from "./HonoClosure.ts";
import HonoView from "./HonoView.ts";
import HonoRedirect from "./HonoRedirect.ts";
import { IERedirectResponse } from "../../@hono-types/declaration/IHonoRedirect.d.ts";
import HonoResponse from "./HonoResponse.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { existsSync } from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import { contentType } from "https://deno.land/std@0.224.0/media_types/mod.ts";

class HonoDispatch {
  #type: "dispatch" | "middleware";
  #forNext: boolean = false;

  #statusCode: ContentfulStatusCode;
  #returnedData: unknown;
  constructor(
    returnedData: Exclude<unknown, null | undefined>,
    type: "dispatch" | "middleware" = "dispatch"
  ) {
    this.#type = type;
    this.#returnedData = returnedData;
    this.#statusCode = 200;
    if (
      this.#returnedData instanceof HonoClosure &&
      this.#type === "middleware"
    ) {
      this.#forNext = true;
    }
  }
  public async build(request: HttpHono["request"], c: Context) {
    if (c.get("from_web")) {
      const sessionValue = c.get("sessionInstance").values;
      const session = c.get("session");
      session.update(sessionValue);
      await session.dispose();
    }
    if (
      request.isMethod("HEAD") &&
      isObject(this.#returnedData) &&
      !(this.#returnedData instanceof HonoResponse)
    ) {
      throw new Error("HEAD method cannot return a response.");
    }
    if (isObject(this.#returnedData)) {
      if (this.#returnedData instanceof HonoView) {
        const dataView = this.#returnedData.getView();
        const rendered = await this.#returnedData.element(
          dataView.viewFile,
          dataView.data
        );
        this.#statusCode = 200;
        return c.html(rendered, 200);
      } else if (this.#returnedData instanceof HonoRedirect) {
        switch ((this.#returnedData as IERedirectResponse).type) {
          case "back":
            return c.redirect(request.header("referer") || "/", 302);
          case "redirect":
          case "to":
          case "route":
            return c.redirect(this.#returnedData.getTargetUrl(), 302);
          default:
            throw new Error("Invalid use of redirect()");
        }
      } else if (this.#returnedData instanceof HonoResponse) {
        const accessData = this.#returnedData.accessData();
        const {
          returnType,
          statusCode = 200,
          error,
          file,
          download,
          headers = {},
          html,
          json,
        } = accessData;
        this.#statusCode = statusCode;
        if (error) {
          throw new Error(error);
        }
        if (request.isMethod("HEAD")) {
          return new Response(null, {
            status: statusCode,
            headers,
          });
        }
        switch (returnType) {
          case "html":
            if (html) {
              return c.html(html, {
                headers,
                status: this.#statusCode,
              });
            }
            throw new Error("HTML content is missing in the response.");
          case "json":
            if (json) {
              return c.json(json, {
                headers,
                status: this.#statusCode,
              });
            }
            throw new Error("JSON content is missing in the response.");
          case "file":
            if (file) {
              if (!existsSync(file)) {
                return c.text("File not found", 404);
              }
              // Open file for reading
              const fileHandle = await Deno.open(file, { read: true });

              return new Response(fileHandle.readable, {
                status: this.#statusCode,
                headers: {
                  "Content-Type": contentType(file) || "text/plain",
                  ...headers,
                },
              });
            }
            throw new Error("File content is missing in the response.");
          case "download":
            if (download) {
              const filePath = Array.isArray(download) ? download[0] : download;
              const downloadName =
                Array.isArray(download) && download.length > 1
                  ? download[1]
                  : undefined;

              // Using Deno or Node fs to stream the file
              const fileStream = (await Deno.open(filePath, { read: true }))
                .readable;

              const headers = new Headers();
              headers.set("Content-Type", "application/octet-stream");
              headers.set(
                "Content-Disposition",
                `attachment; filename="${
                  downloadName || path.basename(filePath)
                }"`
              );

              return new Response(fileStream, {
                status: this.#statusCode || 200,
                headers,
              });
            }
            break;
          default:
            if (!empty(headers)) {
              throw new Error(
                `${request.method()} methods cannot return with headers only.`
              );
            } else {
              throw new Error(
                `${request.method()} methods should have html, json, file, or download.`
              );
            }
        }
      } else {
        this.#statusCode = 200;
        return c.json(JSON.parse(JSON.stringify(this.#returnedData)), 200);
      }
    } else if (isArray(this.#returnedData)) {
      this.#statusCode = 200;
      if (request.expectsJson()) {
        return c.json(this.#returnedData, 200);
      } else {
        return c.text(JSON.stringify(this.#returnedData, null, 2), 200);
      }
    } else if (isNumeric(this.#returnedData) || isString(this.#returnedData)) {
      this.#statusCode = 200;
      if (request.expectsJson()) {
        return c.json(this.#returnedData, 200);
      } else {
        return c.text(String(this.#returnedData), 200);
      }
    } else if (isNull(this.#returnedData)) {
      if (request.expectsJson()) {
        return c.json(null, 200);
      }
      return c.text("null", 200);
    }
    throw new Error(`Route no return`);
  }

  public get isNext(): boolean {
    return this.#forNext;
  }
}

export default HonoDispatch;
