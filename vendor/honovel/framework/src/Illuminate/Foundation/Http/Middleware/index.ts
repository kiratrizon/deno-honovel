import { AbstractStore, CacheManager } from "../../../Cache/index.ts";
import { Cache } from "../../../Support/Facades/index.ts";

/**
 * PayloadParser middleware for Hono framework.
 * This middleware checks the Content-Length header and ensures that the request payload does not exceed configured limits.
 * It supports various content types and applies size limits based on the configuration.
 * If the payload exceeds the limit, it responds with a 413 Payload Too Large error.
 * If the Content-Length header is missing or invalid, it responds with a 411 Length Required error.
 */
export class PayloadParser {
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

export class PreventRequestDuringMaintenance {
  public handle: HttpMiddleware = async ({ request }, next) => {
    let store: AbstractStore;
    try {
      store = this.getMaintenanceStore();
    } catch (_error) {
      if (!env("APP_DEBUG", false)) {
        console.log("Maintenance mode store is not configured.");
      }
      return next();
    }
    const maintenance = await store.get("maintenance");

    if (isset(maintenance) && maintenance) {
      const {
        allow = [],
        secret = "",
        message = "Application is in maintenance mode.",
      } = maintenance;
      if (request.method === "GET" && !request.expectsJson()) {
        if (!empty(secret)) {
          if (request.path() === `/${secret}`) {
            request.cookie("maintenance_bypass", secret, {
              httpOnly: true,
              secure: true,
              expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            });
            abort(200, "Maintenance mode bypassed.");
          }
        }
      }

      // Check if IP is allowed
      const ip = request.ip();
      if (allow.includes(ip)) {
        return next();
      }

      // Check if secret key is present
      const providedSecret =
        request.headers.get("X-Maintenance-Bypass") ||
        request.cookie("maintenance_bypass");
      if (secret && providedSecret === secret) {
        return next();
      }

      abort(503, message);
    }

    return next();
  };

  public getMaintenanceStore() {
    const config = staticConfig("app").maintenance;

    if (!config || !config.driver) {
      throw new Error("Maintenance store is not configured.");
    }
    const cache = staticConfig("cache");
    const store = config.store || cache.default;
    if (!store) {
      throw new Error("Maintenance store is not configured.");
    }

    if (config.driver === "cache") {
      return Cache.store(config.store);
    } else {
      if (!isset(cache.stores) || empty(cache.stores)) {
        throw new Error("Cache stores are not configured.");
      }
      const getStore = cache.stores[store];
      if (!isset(getStore)) {
        throw new Error(`Cache store "${store}" is not configured.`);
      }
      const notAllowedDrivers = ["memory", "object"];
      if (notAllowedDrivers.includes(getStore.driver)) {
        throw new Error(
          `Cache store "${store}" with driver "${getStore.driver}" is not allowed for maintenance mode.`
        );
      }

      Cache.extend(`maintenance_${config.driver}`, () => {
        return new CacheManager(getStore.driver, getStore).getStore();
      });
      return Cache.store(`maintenance_${config.driver}`);
    }
  }
}

export class ConvertEmptyStringsToNull {
  public handle: HttpMiddleware = async ({ request }, next) => {
    request.merge(request.clean(request.all()));
    return next();
  };
}
