import IRedirectResponse, {
  FlashArg,
  IRedirectData,
} from "../../../../@types/declaration/IHonoRedirect.d.ts";

class HonoRedirect implements IRedirectResponse {
  #type: keyof IRedirectData = "redirect";
  #myRedirectData: IRedirectData = {
    redirect: "",
    back: false,
    route: "",
    to: "",
  };
  #flashData: Record<string, unknown> = {};
  #errorData: Record<string, unknown> = {};
  #statusCode: number = 302;
  constructor(private url = null, statusCode = 302) {
    if (isset(this.url) && isString(this.url)) {
      this.#myRedirectData.redirect = this.url;
      this.#type = "redirect";
    }
    this.#statusCode = statusCode;
  }

  public route(name: string, params?: Record<string, unknown>): this {
    this.#type = "route";

    this.#myRedirectData[this.#type] = route(name, params);
    return this;
  }

  public to(path: string): this {
    this.#type = "to";
    if (typeof path !== "string") {
      throw new Error("Path must be a string");
    }
    this.#myRedirectData[this.#type] = path;
    return this;
  }

  public back(): this {
    this.#type = "back";
    this.#myRedirectData[this.#type] = true;
    return this;
  }

  public with(...args: FlashArg): this {
    if (typeof args[0] === "string") {
      this.#flashData[args[0]] = args[1] ?? null;
    } else if (isObject(args[0])) {
      const newData = JSON.parse(JSON.stringify(args[0]));
      Object.assign(this.#flashData, newData);
    }
    return this;
  }

  public withErrors(...args: FlashArg): this {
    if (typeof args[0] === "string") {
      this.#errorData[args[0]] = args[1] ?? null;
    } else if (isObject(args[0])) {
      const newData = JSON.parse(JSON.stringify(args[0]));
      Object.assign(this.#errorData, newData);
    }

    return this;
  }

  public getTargetUrl(): string {
    if (this.#type !== "back") {
      return this.#myRedirectData[this.#type];
    }
    return "";
  }

  public get type(): keyof IRedirectData {
    return this.#type;
  }

  public get statusCode() {
    return this.#statusCode;
  }
}

export default HonoRedirect;
