import { IConstants } from "../../../../@types/declaration/IConstants.d.ts";
import IHonoRequest from "../../../../@types/declaration/IHonoRequest.d.ts";
import { IConfigure } from "../../../../@types/declaration/MyImports.d.ts";

class MyHono implements HttpHono {
  #request: IHonoRequest;
  #config: typeof IConfigure;
  constructor(obj: { request: IHonoRequest; config: typeof IConfigure }) {
    this.#request = obj.request;
    this.#config = obj.config;
  }

  public get request() {
    return this.#request;
  }
  public get Configure() {
    return this.#config;
  }
}

export default MyHono;
