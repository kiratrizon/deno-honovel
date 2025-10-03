import { AbstractStore, CacheManager } from "../../../Cache/index.ts";
import { Cache } from "../../../Support/Facades/index.ts";

export default class PreventRequestDuringMaintenance {
  public handle: HttpMiddleware = async ({ request, Cookie }, next) => {
    let store: AbstractStore;
    try {
      store = this.getMaintenanceStore();
    } catch (_error) {
      if (!env("APP_DEBUG", false)) {
        consoledeno.error("Maintenance mode store is not configured.");
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
            Cookie.queue("maintenance_bypass", secret, {
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
    const conf = config("app").maintenance;

    if (!conf || !conf.driver) {
      throw new Error("Maintenance store is not configured.");
    }
    const cache = config("cache");
    const store = conf.store || cache.default;
    if (!store) {
      throw new Error("Maintenance store is not configured.");
    }

    if (conf.driver === "cache") {
      return Cache.store(conf.store);
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

      Cache.extend(`maintenance_${conf.driver}`, () => {
        return new CacheManager(getStore.driver, getStore).getStore();
      });
      return Cache.store(`maintenance_${conf.driver}`);
    }
  }
}
