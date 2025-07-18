

export default class PayloadParser {
  public handle: HttpMiddleware = async ({ request }, next) => {
    const contentType = (request.header("Content-Type") || "").toLowerCase();
    const contentLengthHeader = request.header("Content-Length") || "0";
    const contentLength = Number(contentLengthHeader);

    if (!contentLengthHeader || isNaN(contentLength) || contentLength < 0) {
      abort(411, "Content-Length required and must be a valid positive number");
    }

    let maxAllowed = 0;

    if (contentType.includes("multipart/form-data")) {
      maxAllowed = this.parseSizeToBytes(env("MAX_FILE_SIZE", "10M"));
    } else if (
      contentType.includes("application/json") ||
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("text/plain") ||
      contentType.includes("application/octet-stream") ||
      contentType === ""
    ) {
      maxAllowed = this.parseSizeToBytes(env("MAX_CONTENT_LENGTH", "1M"));
    } else {
      // For any other types, use generic limit
      maxAllowed = this.parseSizeToBytes(env("MAX_CONTENT_LENGTH", "1M"));
    }

    if ((contentLength > maxAllowed)) {
      abort(413, "Payload Too Large");
    }

    // If within limit, parse the body
    await request.buildRequest();

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

