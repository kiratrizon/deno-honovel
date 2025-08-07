import HonoClosure from "./HonoClosure.ts";
import HonoView from "./HonoView.ts";
import HonoRedirect from "./HonoRedirect.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
import HttpHono from "HttpHono";
import { HonoResponse } from "./HonoResponseV2.ts";

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
  public async build(request: HttpHono["request"], c: MyContext) {
    if (
      request.isMethod("HEAD") &&
      isObject(this.#returnedData) &&
      !(this.#returnedData instanceof HonoResponse)
    ) {
      throw new Error("HEAD method cannot return a response.");
    }
    if (this.#returnedData instanceof Response) {
      return this.convertToResponse(c, this.#returnedData);
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
        switch (this.#returnedData.type) {
          case "back":
            // @ts-ignore //
            return c.redirect(request.session.get("_newUrl") || "/", 302);
          case "redirect":
          case "to":
          case "route":
            return c.redirect(this.#returnedData.getTargetUrl(), 302);
          default:
            throw new Error("Invalid use of redirect()");
        }
      } else if (this.#returnedData instanceof HonoResponse) {
        // @ts-ignore //
        const cookies = this.#returnedData.getCookies();
        for (const [name, [value, options]] of Object.entries(cookies)) {
          request.cookie(name, value, options);
        }
        // @ts-ignore //
        const res = this.#returnedData.toResponse();

        return this.convertToResponse(c, res);
      } else {
        return c.text(
          JSON.stringify(this.#returnedData, null, 2),
          this.#statusCode
        );
      }
    } else {
      if (isString(this.#returnedData)) {
        return c.text(this.#returnedData, this.#statusCode);
      } else {
        return c.text(
          JSON.stringify(this.#returnedData, null, 2),
          this.#statusCode
        );
      }
    }
  }

  private convertToResponse(c: MyContext, res: Response): Response {
    const newRes = c.newResponse(
      res.body,
      res.status as ContentfulStatusCode,
      Object.fromEntries(res.headers)
    );
    return newRes;
  }

  public get isNext(): boolean {
    return this.#forNext;
  }
}

export default HonoDispatch;
