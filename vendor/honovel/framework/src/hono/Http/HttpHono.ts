import { IConfigure } from "../../../../@types/declaration/MyImports.d.ts";
import HonoRequest from "HonoHttp/HonoRequest.ts";
import HRequest from "HonoHttp/HonoRequest.d.ts";
import Constants from "Constants";
import { Auth } from "Illuminate/Support/Facades/index.ts";
import { Cookie } from "./HonoCookie.ts";

class HttpHono {
  #request: HonoRequest;
  #config: typeof IConfigure;
  #c: MyContext;
  #auth: Auth;
  #Cookie: Cookie;
  constructor(c: MyContext) {
    this.#c = c;
    this.#request = new HonoRequest(this.#c);
    this.#config = new Constants(myConfigData) as unknown as typeof IConfigure;
    this.#auth = new Auth(this.#c);
    this.#Cookie = new Cookie(this.#c);
  }

  public get request(): HRequest {
    // @ts-ignore //
    return this.#request;
  }
  public get Configure() {
    return this.#config;
  }

  public get csrfToken() {
    // deno-lint-ignore no-this-alias
    const self = this;
    return function (): string {
      if (!self.#request.session.has("_token")) {
        self.#request.session.regenerateToken();
      }
      return self.#request.session.token();
    };
  }

  public get Auth() {
    return this.#auth;
  }

  public get Cookie() {
    return this.#Cookie;
  }
}

export default HttpHono;
