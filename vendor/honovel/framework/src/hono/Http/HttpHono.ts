import { IConstants } from "../../@hono-types/declaration/IConstants.d.ts";
import IHonoRequest from "../../@hono-types/declaration/IHonoRequest.d.ts";
import HonoCookie from "./HonoCookie.ts";

class MyHono implements HttpHono {
  #request: IHonoRequest;
  #config: IConstants;
  #cookie: HonoCookie;
  constructor(obj: {
    request: IHonoRequest;
    config: IConstants;
    cookie: HonoCookie;
  }) {
    this.#request = obj.request;
    this.#config = obj.config;
    this.#cookie = obj.cookie;
  }

  public get request() {
    return this.#request;
  }
  public get Config() {
    return this.#config;
  }

  public get cookie() {
    return this.#cookie;
  }
}

export default MyHono;
