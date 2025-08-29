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
} from "Illuminate/Routing/Middleware/index.ts";
import VerifyCsrfToken from "App/Http/Middlewares/VerifyCsrfToken.ts";
import Authenticate from "./Middlewares/Authenticate.ts";
import { HandleCors } from "Illuminate/Http/Middleware/index.ts";
import TrimStrings from "App/Http/Middlewares/TrimStrings.ts";
import TrustProxies from "App/Http/Middlewares/TrustProxies.ts";
import {
  AuthenticateWithBasicAuth,
  Authorize,
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
    web: [
      StartSession, // Starts the session for web requests
      VerifyCsrfToken, // Verifies CSRF tokens for web requests
    ],
    api: [
      "throttle:10,1",
      "ensure_accepts_json", // Ensures the request accepts JSON
    ],
  };

  /**
   * to be implemented in the future
   protected $routeMiddleware = [
    'auth' => \App\Http\Middleware\Authenticate::class,
    'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
    'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
    'can' => \Illuminate\Auth\Middleware\Authorize::class,
    'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
    'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
    'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
    'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
    'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
  ];
   */
  protected override routeMiddleware = {
    auth: Authenticate,
    "auth.basic": AuthenticateWithBasicAuth,
    can: Authorize,
    ensure_accepts_json: EnsureAcceptsJson,
    guest: RedirectIfAuthenticated,
    "password.confirm": RequirePassword,
    throttle: ThrottleRequests,
  };
}

export default Kernel;
