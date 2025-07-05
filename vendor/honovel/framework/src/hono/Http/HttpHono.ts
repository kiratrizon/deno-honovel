import { IConfigure } from "../../../../@types/declaration/MyImports.d.ts";
import HonoRequest from "./HonoRequest.ts";
import Constants from "Constants";

class HttpHono {
  #request: HonoRequest;
  #config: typeof IConfigure;
  #c: MyContext;
  constructor(c: MyContext) {
    this.#c = c;
    this.#request = new HonoRequest(this.#c);
    this.#config = new Constants(myConfigData) as unknown as typeof IConfigure;
  }

  public get request() {
    return this.#request;
  }
  public get Configure() {
    return this.#config;
  }
}

export default HttpHono;
