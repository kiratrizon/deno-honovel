import { StartSession } from "Illuminate/Session/Middleware/index.ts";
import {
  ConvertEmptyStringsToNull,
  PayloadParser,
  PreventRequestDuringMaintenance,
  ValidatePostSize,
} from "Illuminate/Foundation/Http/Middleware/index.ts";
import { HttpKernel } from "Illuminate/Foundation/Http/index.ts";
import {
  EnsureAcceptsJson,
  ThrottleRequests,
  ValidateSignature,
} from "Illuminate/Routing/Middleware/index.ts";
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
    /**
     'web' => [
        \App\Http\Middleware\EncryptCookies::class,
        \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
        \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\View\Middleware\ShareErrorsFromSession::class,
        \App\Http\Middleware\VerifyCsrfToken::class,
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
      ],
    */
    web: [
      StartSession, // Starts the session for web requests
      VerifyCsrfToken, // Verifies CSRF tokens for web requests
    ],
    api: [
      "throttle:10,1",
      "ensure_accepts_json", // Ensures the request accepts JSON
    ],
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
