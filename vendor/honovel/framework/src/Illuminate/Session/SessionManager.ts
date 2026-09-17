import { CacheDriver, SessionConfig } from "configs/@types/index.d.ts";
import { Cache } from "../Support/Facades/index.ts";
import CacheManager from "../Cache/CacheManager.ts";
import AbstractStore from "../Cache/Stores/AbstractStore.ts";
import CacheSessionHandler from "./Handlers/CacheSessionHandler.ts";
import { SessionHandler } from "./SessionHandler.ts";
import Store, { SessionStore } from "./Store.ts";
import EncryptedStore from "./EncryptedStore.ts";

/**
 * Resolves the configured session driver into a Store.
 *
 * Every supported session driver already exists as a cache store, so this
 * maps config("session") onto the Cache layer and wraps the result in a
 * handler. The cache store itself is memoised by Cache.extend/Cache.store; only
 * the Store is per-request, since it carries that request's id and values.
 */
export default class SessionManager {
  #config: SessionConfig;

  constructor() {
    this.#config = config("session");
    if (!this.#config) {
      throw new Error("Session configuration is not set.");
    }
  }

  /**
   * A Store for this request.
   *
   * The caller is expected to seed it with the incoming cookie value before
   * starting it:
   *
   *   const store = new SessionManager().driver();
   *   store.setId(Cookie.get(store.getName()));
   *   await store.start();
   */
  public driver(): SessionStore {
    return this.buildSession(this.handler());
  }

  /**
   * Wrap a handler in the right Store for the configuration.
   * Encryption is a property of the Store, not the handler, so the handler
   * moves an opaque string either way.
   */
  protected buildSession(handler: SessionHandler): SessionStore {
    return this.#config.encrypt
      ? new EncryptedStore(this.#config.cookie, handler)
      : new Store(this.#config.cookie, handler);
  }

  /**
   * The persistence layer for the configured driver.
   */
  public handler(): SessionHandler {
    return new CacheSessionHandler(this.cacheStore(), this.#config.lifetime);
  }

  /**
   * The cache store backing sessions.
   */
  private cacheStore(): AbstractStore {
    const driver = this.#config.driver || "file";

    if (config("app").env !== "local" && driver === "file") {
      throw new Error(
        "File session driver is not allowed in production environment.",
      );
    }

    // "cache" means "reuse one of the application's own stores as-is".
    if (driver === "cache") {
      const name = this.#config.store || config("cache").default;
      if (!isset(name)) {
        throw new Error("Session store configuration is not set.");
      }
      if (!keyExist(config("cache").stores || {}, name)) {
        throw new Error(`Session store "${name}" does not exist.`);
      }
      return Cache.store(name);
    }

    // A custom store has no way to express its class through session config;
    // it has to be registered as a cache store and selected via "cache".
    if (driver === "custom") {
      throw new Error(
        'Session driver "custom" is not supported directly. Register the store in config("cache").stores, ' +
          'then set config("session").driver to "cache" and config("session").store to its name.',
      );
    }

    // Otherwise sessions get their own store, registered under a private name
    // so it cannot collide with the application cache.
    const keyStore = `${driver}_session`;
    Cache.extend(keyStore, () =>
      new CacheManager(driver, this.storeOptions(driver)).getStore(),
    );
    return Cache.store(keyStore);
  }

  /**
   * Translate the session config into CacheManager options for the driver.
   */
  private storeOptions(driver: Exclude<CacheDriver, "custom">): {
    path?: string;
    connection?: string;
    prefix: string;
    table?: string;
    servers?: { host: string; port: number; weight?: number }[];
  } {
    const prefix = this.#config.prefix || "sess:";

    switch (driver) {
      case "file": {
        const path = this.#config.files || storagePath("framework/sessions");
        if (!pathExists(path)) {
          makeDir(path);
        }
        return { prefix, path };
      }
      case "redis": {
        return { prefix, connection: this.#config.connection ?? undefined };
      }
      case "database": {
        return {
          prefix,
          connection: this.#config.connection ?? undefined,
          table: this.#config.table || "sessions",
        };
      }
      case "memcached": {
        const name = this.#config.store || "default";
        const chosen = (config("cache").stores || {})[name];
        if (chosen?.driver !== "memcached") {
          throw new Error(
            `Session store "${name}" is not a memcached driver.`,
          );
        }
        return { prefix, servers: chosen.servers };
      }
      default: {
        // memory / object need nothing beyond the prefix.
        return { prefix };
      }
    }
  }
}
