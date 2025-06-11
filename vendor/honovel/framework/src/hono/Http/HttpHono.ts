import { IConstants } from "../../@hono-types/declaration/IConstants.d.ts";
import IHonoRequest from "../../@hono-types/declaration/IHonoRequest.d.ts";

class MyHono implements HttpHono {
  #request: IHonoRequest;
  #config: IConstants;
  constructor(obj: {
    request: IHonoRequest;
    config: IConstants;
  }) {
    this.#request = obj.request;
    this.#config = obj.config;
  }

  public get request() {
    return this.#request;
  }
  public get Config() {
    return this.#config;
  }
}

export default MyHono;
