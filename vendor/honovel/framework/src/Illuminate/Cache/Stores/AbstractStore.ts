import { Carbon } from "helpers";

type MaintenanceData = {
  message: string;
  retry: number;
  allow: string[];
  secret: string;
  render: string;
  redirect: string;
  timestamp: number;
};

export interface CacheStoreData {
  maintenance: MaintenanceData;
  [key: string]: any;
}

export default abstract class AbstractStore<
  T extends CacheStoreData = CacheStoreData,
> {
  protected prefix: string = "";
  /**
   * @param prefix The prefix to use for cache keys.
   */
  constructor(prefix?: string) {
    this.prefix = prefix || config("cache").prefix || "";
  }
  /**
   * @param key The key to retrieve from the cache.
   * @returns The value associated with the key, or null if not found.
   */
  abstract get<K extends keyof T>(key: K): Promise<T[K]>;
  abstract get(key: string): Promise<any>;

  /**
   * Store an item in the cache for a given number of seconds.
   * @param key The key to store the value under.
   * @param value The value to store.
   * @param seconds The number of seconds until the item should expire.
   */
  abstract put<K extends keyof T>(
    key: K,
    value: T[K],
    seconds: number,
  ): Promise<void>;
  abstract put(key: string, value: any, seconds: number): Promise<void>;

  /**
   * Remove an item from the cache.
   * @param key The key to remove from the cache.
   */
  abstract forget<K extends keyof T>(key: K): Promise<void>;
  abstract forget(key: string): Promise<void>;

  /**
   * Remove all items from the cache.
   */
  abstract flush(): Promise<void>;

  /**
   * Get the prefix used for cache keys.
   * This is typically used to avoid key collisions between different applications or environments.
   */
  abstract getPrefix(): string;

  /**
   * Store an item in the cache indefinitely.
   */
  async forever<K extends keyof T>(key: K, value: T[K] | any): Promise<void> {
    // Convention: use 0 or -1 to mean "forever"
    await this.put(key, value, 0);
  }

  /**
   * Increment the value of an item in the cache.
   */
  async increment<K extends keyof T>(
    key: K,
    value?: number,
  ): Promise<number | null>;

  async increment(key: string, value?: number): Promise<number | null>;

  // Implementation
  async increment(
    key: keyof T | string,
    value: number = 1,
  ): Promise<number | null> {
    const current = await this.get(key as any);
    if (typeof current === "number") {
      const newVal = current + value;
      await this.put(key as any, newVal, 0);
      return newVal;
    }
    return null;
  }

  /**
   * Decrement the value of an item in the cache.
   */
  async decrement<K extends keyof T>(
    key: K,
    value?: number,
  ): Promise<number | null>;
  async decrement(key: string, value?: number): Promise<number | null>;
  async decrement(
    key: keyof T | string,
    value: number = 1,
  ): Promise<number | null> {
    const current = await this.get(key as any);
    if (typeof current === "number") {
      const newVal = current - value;
      await this.put(key as any, newVal, 0);
      return newVal;
    }
    return null;
  }

  /**
   * Get a value or return default.
   */
  async getOrDefault<K extends keyof T>(
    key: K,
    defaultValue: T[K],
  ): Promise<T[K]>;
  async getOrDefault(key: string, defaultValue: any): Promise<any>;
  async getOrDefault(key: keyof T | string, defaultValue: any): Promise<any> {
    const value = await this.get(key as any);
    return value !== null && value !== undefined ? value : defaultValue;
  }

  /**
   * Check if a key exists in cache.
   */
  async has<K extends keyof T>(key: K): Promise<boolean>;
  async has(key: string): Promise<boolean>;
  async has(key: keyof T | string): Promise<boolean> {
    const value = await this.get(key as any);
    return isset(value);
  }

  protected validateKey(key: string): string {
    if (!isset(key) || empty(key) || !isString(key)) {
      throw new Error(`Key must be a non-empty string`);
    }
    if (key.includes(" ")) {
      throw new Error(`Key cannot contain spaces: "${key}"`);
    }
    if (!key.trim()) {
      throw new Error(`Key cannot be an empty string`);
    }
    const keys = [this.getPrefix(), key];
    const newKey = keys.filter((k) => isset(k) && !empty(k)).join("");
    return newKey;
  }

  protected warning(storeType: string, err: boolean = false) {
    if (config("app").env !== "local") {
      if (!err) {
        console.warn(
          `${storeType} cache store is not recommended for production environments.`,
        );
      } else {
        throw new Error(
          `${storeType} cache store is not allowed for production environments.`,
        );
      }
    }
  }
}
