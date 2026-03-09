import HonoRequest from "../../framework/src/hono/Http/HonoRequest.d.ts";
import { Auth } from "Illuminate/Support/Facades/index.ts";
import { Cookie } from "../../framework/src/hono/Http/HonoCookie.ts";
import { IConfigure } from "./MyImports.d.ts";

declare class IHttpHono {
  /** Create a new HttpHono instance with the context */
  constructor(c: MyContext);

  /** Access the HonoRequest instance */
  readonly request: HonoRequest;

  /** Access the application configuration */
  readonly Configure: typeof IConfigure;

  /** Get a function that returns or generates the CSRF token */
  readonly csrfToken: () => string;

  /** Access the Auth instance for authentication operations */
  readonly Auth: Auth;

  /** Access the Cookie instance for cookie operations */
  readonly Cookie: Cookie;
}

export default IHttpHono;
