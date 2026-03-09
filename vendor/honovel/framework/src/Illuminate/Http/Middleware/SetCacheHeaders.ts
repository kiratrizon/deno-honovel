export default class SetCacheHeaders {
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
          // user must provide the value here, we can't compute automatically
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
