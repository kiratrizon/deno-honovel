import IHonoRequest from "../../../../@types/declaration/IHonoRequest.d.ts";
import { IConfigure } from "../../../../@types/declaration/MyImports.d.ts";
import { SessionVar } from "./HonoSession.ts";

class MyHono implements HttpHono {
  #request: IHonoRequest;
  #config: typeof IConfigure;
  #session: SessionVar;
  constructor(obj: {
    request: IHonoRequest;
    config: typeof IConfigure;
    session: SessionVar;
  }) {
    this.#request = obj.request;
    this.#config = obj.config;
    this.#session = obj.session;
  }

  public get request() {
    return this.#request;
  }
  public get Configure() {
    return this.#config;
  }

  public get session() {
    return this.#session;
  }
}

export default MyHono;
