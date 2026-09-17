import AbstractStore from "../../Cache/Stores/AbstractStore.ts";
import { SessionHandler } from "../SessionHandler.ts";

/**
 * Persists sessions through the Cache layer.
 *
 * Every session driver the framework supports (file, redis, database,
 * memcached, memory, object) already exists as an AbstractStore, so there is no
 * separate hierarchy of session drivers - SessionManager picks the cache store
 * and hands it here.
 */
export default class CacheSessionHandler extends SessionHandler {
  /**
   * @param store   The cache store backing this handler.
   * @param minutes Session lifetime in minutes, used as the write TTL.
   */
  constructor(
    private readonly store: AbstractStore,
    private readonly minutes: number,
  ) {
    super();
  }

  /**
   * Cache stores are configured when they are constructed, so there is nothing
   * to open. Kept to satisfy the handler contract.
   */
  public open(_savePath: string, _sessionName: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  public close(): Promise<boolean> {
    return Promise.resolve(true);
  }

  public async read(sessionId: string): Promise<string> {
    const payload = await this.store.get(sessionId);
    // Anything that is not a string is treated as a miss: an expired entry, or
    // data written by an older format.
    return isString(payload) ? payload : "";
  }

  public async write(sessionId: string, data: string): Promise<boolean> {
    await this.store.put(sessionId, data, this.minutes * 60);
    return true;
  }

  public async destroy(sessionId: string): Promise<boolean> {
    await this.store.forget(sessionId);
    return true;
  }

  /**
   * The cache store's own TTL already decides when an entry dies, so
   * `maxLifetime` is advisory here - the sweep just drops what has expired.
   */
  public async gc(_maxLifetime: number): Promise<boolean> {
    if (!methodExist(this.store, "deleteExpired")) return false;
    await this.store.deleteExpired();
    return true;
  }

  /**
   * The underlying cache store, for callers that need it directly.
   */
  public getCacheStore(): AbstractStore {
    return this.store;
  }
}
