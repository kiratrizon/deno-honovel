import IHonoRequest, {
  RequestData,
} from "../../../../@types/declaration/IHonoRequest.d.ts";
import { IConfigure } from "../../../../@types/declaration/MyImports.d.ts";
import { SessionVar } from "./HonoSession.ts";
import HonoRequest from "./HonoRequest.ts";
import Constants from "Constants";
import HonoCookie from "./HonoCookie.ts";

class MyHono implements IMyHono {
  #request: IHonoRequest;
  #config: typeof IConfigure;
  #session: SessionVar;
  #raw: RequestData;
  #c: MyContext;
  #cookie: HonoCookie;
  constructor(c: MyContext, req: RequestData) {
    this.#c = c;
    this.#raw = req;
    this.#request = new HonoRequest(this.#c, this.#raw);
    this.#config = new Constants(myConfigData) as unknown as typeof IConfigure;
    this.#session = new SessionVar(this.#c);
    this.#cookie = new HonoCookie(this.#c);
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
  public get cookie() {
    return this.#cookie;
  }
}

export default MyHono;
