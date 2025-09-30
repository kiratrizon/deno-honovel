import { Str } from "../../Support/index.ts";

export class HandleCors {
  public handle: HttpMiddleware = async ({ request, Configure }, next) => {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    const corsConfig = Configure.read("cors", {});

    const allowedOrigins = (corsConfig.allowed_origins || []).map(
      (origin: string) => {
        return origin.endsWith("/") ? origin.slice(0, -1) : origin;
      }
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
          allowCredentials ? "true" : "false"
        );
    }

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

export class SetCacheHeaders {
  public handle: HttpMiddleware = async (_, next, cacheControl?: string) => {
    const res = next();

    if (cacheControl) {
      const parts = cacheControl.split(";");

      const directives: string[] = [];

      for (const part of parts) {
        if (part === "public") {
          directives.push("public");
        } else if (part === "private") {
          directives.push("private");
        } else if (part.startsWith("max_age=")) {
          const seconds = part.split("=")[1];
          directives.push(`max-age=${seconds}`);
        } else if (part.startsWith("etag=")) {
          // user must provide the value here, we can’t compute automatically
          const value = part.split("=")[1];
          res.headers.set("ETag", `"${value}"`);
        }
      }

      if (directives.length > 0) {
        res.headers.set("Cache-Control", directives.join(", "));
      }
    }

    return res;
  };
}
