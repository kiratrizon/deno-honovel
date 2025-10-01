export default class ValidatePostSize {
  public handle: HttpMiddleware = async ({ request, Configure }, next) => {
    const contentLength = request.header("Content-Length");

    const maxPostSize = Configure.read("post.max_size", "2M") as string; // Default to 2MB
    if (contentLength) {
      const length = parseInt(contentLength, 10);

      if (!isNaN(length) && length > this.parseSizeToBytes(maxPostSize)) {
        // Laravel-like abort
        abort(413, "Payload Too Large");
      }
    }

    return next();
  };

  private parseSizeToBytes(size: string): number {
    const units: Record<string, number> = {
      B: 1,
      K: 1024,
      M: 1024 ** 2,
      G: 1024 ** 3,
    };

    const normalized = size.trim().toUpperCase().replace(/B$/, ""); // e.g. 10MB => 10M
    const match = normalized.match(/^(\d+)([KMG]?)$/);
    if (!match) throw new Error(`Invalid size format: ${size}`);

    const [, num, unit] = match;
    return parseInt(num, 10) * (units[unit || "B"] || 1);
  }
}
