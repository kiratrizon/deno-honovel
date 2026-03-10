import TrustProxies from "App/Http/Middlewares/TrustProxies.ts";
import PreventRequestDuringMaintenance from "../Http/Middleware/PreventRequestDuringMaintenance.ts";
import { HandleCors } from "../../Http/Middleware/index.ts";
import ValidatePostSize from "../Http/Middleware/ValidatePostSize.ts";
import TrimStrings from "App/Http/Middlewares/TrimStrings.ts";
import ConvertEmptyStringsToNull from "../Http/Middleware/ConvertEmptyStringsToNull.ts";
import EncryptCookies from "App/Http/Middlewares/EncryptCookies.ts";
import SubstituteBindings from "../../Routing/Middleware/SubstituteBindings.ts";
import StartSession from "../../Session/Middleware/StartSession.ts";
import VerifyCsrfToken from "App/Http/Middlewares/VerifyCsrfToken.ts";
import Authenticate from "App/Http/Middlewares/Authenticate.ts";
import AuthenticateWithBasicAuth from "../../Auth/Middleware/AuthenticateWithBasicAuth.ts";
import SetCacheHeaders from "../../Http/Middleware/SetCacheHeaders.ts";
import Authorize from "../../Auth/Middleware/Authorize.ts";
import EnsureAcceptsJson from "../../Routing/Middleware/EnsureAcceptsJson.ts";
import RedirectIfAuthenticated from "App/Http/Middlewares/RedirectIfAuthenticated.ts";
import RequirePassword from "../../Auth/Middleware/RequirePassword.ts";
import ValidateSignature from "../../Routing/Middleware/ValidateSignature.ts";
import ThrottleRequests from "../../Routing/Middleware/ThrottleRequests.ts";
import EnsureEmailIsVerified from "../../Auth/Middleware/EnsureEmailIsVerified.ts";
import PayloadParser from "../Http/Middleware/PayloadParser.ts";

export interface MiddlewareLikeInstance {
  handle?: HttpMiddleware;
  fallback?: HttpMiddleware;
}

export interface MiddlewareLikeClass {
  new (): MiddlewareLikeInstance;
}

export type MiddlewareLike = string | MiddlewareLikeClass;

export default class Middleware {
  private static global: MiddlewareLikeClass[] = [
    TrustProxies,
    PreventRequestDuringMaintenance,
    HandleCors,
    PayloadParser,
    ValidatePostSize,
    TrimStrings,
    ConvertEmptyStringsToNull,
  ];
  private static groups: Record<string, MiddlewareLike[]> = {
    web: [EncryptCookies, StartSession, VerifyCsrfToken, SubstituteBindings],
    api: [SubstituteBindings],
  };
  private static aliases: Record<string, MiddlewareLikeClass> = {
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

  public static append(middleware: MiddlewareLikeClass) {
    this.global.push(middleware);
    return this;
  }

  public static prepend(middleware: MiddlewareLikeClass) {
    this.global.unshift(middleware);
    return this;
  }

  public static group(name: string, middleware: MiddlewareLike[]) {
    this.groups[name].push(
      ...(isArray(middleware) ? middleware : [middleware]),
    );
    return this;
  }

  public static alias(aliases: Record<string, MiddlewareLikeClass>) {
    Object.assign(this.aliases, aliases);
    return this;
  }

  public static web(middleware: MiddlewareLike[]) {
    this.groups["web"].push(
      ...(isArray(middleware) ? middleware : [middleware]),
    );
    return this;
  }

  public static api(middleware: MiddlewareLike[]) {
    this.groups["api"].push(
      ...(isArray(middleware) ? middleware : [middleware]),
    );
    return this;
  }

  // for instance
  public get global() {
    return Middleware.global;
  }

  public get groups() {
    return Middleware.groups;
  }

  public get aliases() {
    return Middleware.aliases;
  }
}
