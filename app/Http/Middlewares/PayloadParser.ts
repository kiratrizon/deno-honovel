export default class PayloadParser {
  public handle: HttpMiddleware = async ({ request }, next) => {
    const contentType = (request.header("Content-Type") || "").toLowerCase();
    const contentLengthHeader = request.header("Content-Length") || "0";
    const contentLength = Number(contentLengthHeader);

    if (!contentLengthHeader || isNaN(contentLength) || contentLength < 0) {
      abort(411, "Content-Length required and must be a valid positive number");
    }

    let maxAllowed = 0;

    const payloadLimits = staticConfig("payloadLimits") || {};
    // Use normalized logic based on config
    if (contentType.includes("multipart/form-data")) {
      // @ts-ignore //
      maxAllowed = this.parseSizeToBytes(payloadLimits.multipart ?? "10M");
    } else if (contentType.includes("application/json")) {
      // @ts-ignore //
      maxAllowed = this.parseSizeToBytes(payloadLimits.json ?? "1M");
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      // @ts-ignore //
      maxAllowed = this.parseSizeToBytes(payloadLimits.urlencoded ?? "1M");
    } else if (contentType.includes("text/plain")) {
      // @ts-ignore //
      maxAllowed = this.parseSizeToBytes(payloadLimits.text ?? "1M");
    } else if (contentType.includes("application/octet-stream")) {
      // @ts-ignore //
      maxAllowed = this.parseSizeToBytes(payloadLimits.octet ?? "1M");
    } else {
      // Fallback for unknown or empty content types
      // @ts-ignore //
      maxAllowed = this.parseSizeToBytes(payloadLimits.json ?? "1M");
    }

    if (contentLength > maxAllowed) {
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
