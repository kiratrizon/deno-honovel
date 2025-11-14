import StartSession from "Illuminate/Session/Middleware/StartSession.ts";
import ConvertEmptyStringsToNull from "Illuminate/Foundation/Http/Middleware/ConvertEmptyStringsToNull.ts";
import PayloadParser from "Illuminate/Foundation/Http/Middleware/PayloadParser.ts";
import ValidatePostSize from "Illuminate/Foundation/Http/Middleware/ValidatePostSize.ts";
import PreventRequestDuringMaintenance from "Illuminate/Foundation/Http/Middleware/PreventRequestDuringMaintenance.ts";
import { HttpKernel } from "Illuminate/Foundation/Http/index.ts";
import EnsureAcceptsJson from "Illuminate/Routing/Middleware/EnsureAcceptsJson.ts";
import SubstituteBindings from "Illuminate/Routing/Middleware/SubstituteBindings.ts";
import ValidateSignature from "Illuminate/Routing/Middleware/ValidateSignature.ts";
import ThrottleRequests from "Illuminate/Routing/Middleware/ThrottleRequests.ts";

import VerifyCsrfToken from "App/Http/Middlewares/VerifyCsrfToken.ts";
import Authenticate from "./Middlewares/Authenticate.ts";
import {
  HandleCors,
  SetCacheHeaders,
} from "Illuminate/Http/Middleware/index.ts";
import TrimStrings from "App/Http/Middlewares/TrimStrings.ts";
import TrustProxies from "App/Http/Middlewares/TrustProxies.ts";
import {
  AuthenticateWithBasicAuth,
  Authorize,
  EnsureEmailIsVerified,
  RequirePassword,
} from "Illuminate/Auth/Middleware/index.ts";
import RedirectIfAuthenticated from "./Middlewares/RedirectIfAuthenticated.ts";
import EncryptCookies from "./Middlewares/EncryptCookies.ts";

class Kernel extends HttpKernel {
  protected override middleware = [
    TrustProxies,
    // Uncomment this line to enable maintenance mode, you can use it using `deno task smelt down --secret=your_secret`
    // PreventRequestDuringMaintenance,
    HandleCors,
    PayloadParser, // Parses the request payload, handling JSON and form data.
    ValidatePostSize,
    TrimStrings,
    ConvertEmptyStringsToNull,
  ];

  protected override middlewareGroups = {
    // to be implemented laravel's \Illuminate\View\Middleware\ShareErrorsFromSession::class,
    web: [
      EncryptCookies, // Encrypts cookies for web requests
      StartSession, // Starts the session for web requests
      VerifyCsrfToken, // Verifies CSRF tokens for web requests
      SubstituteBindings,
    ],
    api: ["throttle:10,1", SubstituteBindings],
  };

  protected override routeMiddleware = {
    auth: Authenticate,
    "auth.basic": AuthenticateWithBasicAuth,
    "cache.headers": SetCacheHeaders,
    can: Authorize,
    ensure_accepts_json: EnsureAcceptsJson,
    guest: RedirectIfAuthenticated,
    "password.confirm": RequirePassword,
    signed: ValidateSignature,
    throttle: ThrottleRequests,
    verified: EnsureEmailIsVerified,
  };
}

export default Kernel;
