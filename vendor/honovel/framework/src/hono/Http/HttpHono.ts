import HonoRequest from "HonoHttp/HonoRequest.ts";
import HRequest from "HonoHttp/HonoRequest.d.ts";
import { Auth } from "Illuminate/Support/Facades/index.ts";
import { Cookie } from "./HonoCookie.ts";

class HttpHono {
  #request: HonoRequest;
  #c: MyContext;
  #auth: Auth;
  #Cookie: Cookie;
  constructor(c: MyContext) {
    this.#c = c;
    this.#request = new HonoRequest(this.#c);
    this.#auth = new Auth(this.#c);
    this.#Cookie = new Cookie(this.#c);
  }

  public get request(): HRequest {
    // @ts-ignore //
    return this.#request;
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

  protected changeRequest(newRequest: typeof HonoRequest) {
    this.#request = new newRequest(this.#c);
  }
}

export default HttpHono;
