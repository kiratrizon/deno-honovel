import { Str } from "../../Support/index.ts";

export default class HandleCors {
  public handle: HttpMiddleware = async ({ request, Configure }, next) => {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    const corsConfig = Configure.read("cors", {});

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

    // set variables for fallback
    request.set("isSameOrigin", isSameOrigin);
    request.set("allowedOrigins", allowedOrigins);
    request.set("allowedMethods", allowedMethods);
    request.set("allowedHeaders", allowedHeaders);
    request.set("allowCredentials", allowCredentials);
    request.set("origin", origin);
    return next();
  };

  public fallback: HttpMiddleware = async ({ request }, next) => {
    const isSameOrigin = request.get("isSameOrigin") as boolean;
    const allowedOrigins = (request.get("allowedOrigins") || []) as string[];
    const allowedMethods = (request.get("allowedMethods") || []) as string[];
    const allowedHeaders = (request.get("allowedHeaders") || []) as string[];
    const allowCredentials = (request.get("allowCredentials") ||
      false) as boolean;
    const origin = (request.get("origin") || "") as string;

    const res = next();

    if (isSameOrigin || allowedOrigins.includes(origin)) {
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
