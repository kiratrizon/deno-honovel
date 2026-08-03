import { Str } from "../../Support/index.ts";

export default class HandleCors {
  public handle: HttpMiddleware = async ({ request }, next) => {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    const corsConfig = config("cors");

    const allowedOrigins = (corsConfig.allowed_origins || []).map(
      (origin: string) => {
        return origin.endsWith("/") ? origin.slice(0, -1) : origin;
      },
    );
    const allowedMethods = corsConfig.allowed_methods || [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ];
    const allowedHeaders = corsConfig.allowed_headers || [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ];
    const allowCredentials = corsConfig.supports_credentials || false;
    const corsPaths = corsConfig.paths || [];
    const isSameOrigin = !origin || origin === host;
    const matchesCorsPath = corsPaths.some((pattern: string) => {
      // Check if the request path matches any of the configured CORS paths
      if (pattern.startsWith("/web")) {
        pattern = pattern.replace("/web", "");
      }
      return Str.is(pattern, request.path());
    });

    // If this path doesn't need CORS, skip it
    if (!matchesCorsPath) {
      abort(403);
    }

    // Handle preflight request
    if (request.isMethod("OPTIONS")) {
      return response("", 200)
        .header("Access-Control-Allow-Origin", origin || host || "*")
        .header("Access-Control-Allow-Methods", allowedMethods.join(", "))
        .header("Access-Control-Allow-Headers", allowedHeaders.join(", "))
        .header(
          "Access-Control-Allow-Credentials",
          allowCredentials ? "true" : "false",
        );
    }

    const res = await next();

    if (isSameOrigin || allowedOrigins.includes(origin as string)) {
      res.headers.set("Access-Control-Allow-Origin", origin || "*");
      res.headers.set("Access-Control-Allow-Methods", allowedMethods.join(","));
      res.headers.set("Access-Control-Allow-Headers", allowedHeaders.join(","));
      if (allowCredentials) {
        res.headers.set("Access-Control-Allow-Credentials", "true");
      }
    } else {
      // Block if not same-origin and not in allowed list
      res.headers.set("Access-Control-Allow-Origin", "null");
    }

    return res;
  };
}
