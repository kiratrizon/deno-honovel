import AbstractStore from "./AbstractStore.ts";
import { Carbon } from "helpers";

export default class MemoryStore extends AbstractStore {
  constructor(opts: { prefix?: string } = { prefix: "" }) {
    super(opts.prefix);
    this.warning("Memory driver");
  }
  private store: any;
  #initialized = false;
  private async init() {
    if (this.#initialized) return;
    this.#initialized = true;
    try {
      const { InMemoryCached } = await import("@avroit/memcached");
      this.store = new InMemoryCached();
    } catch (_error) {
      console.error(
        "Failed to load @avroit/memcached. Please install it using:",
      );
      console.error("  deno task install:driver --cache memcached");
      throw new Error(
        // @ts-ignore //
        _error.message ||
          "MemoryStore requires @avroit/memcached to be installed.",
      );
    }
  }
  async get(key: string): Promise<any> {
    await this.init();
    const newKey = this.validateKey(key);
    const cacheItem = await this.store.get(newKey);
    if (!isset(cacheItem)) return null; // Key does not exist
    return jsonDecode(cacheItem);
  }
  async put(key: string, value: any, seconds: number): Promise<void> {
    await this.init();
    value = jsonEncode(value);
    const newKey = this.validateKey(key);
    const expiresAt =
      seconds > 0
        ? (strToTime(Carbon.now().addSeconds(seconds)) as number)
        : undefined;

    await this.store.set(newKey, value, expiresAt);
  }
  async forget(key: string): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    await this.store.delete(newKey);
  }
  async flush(): Promise<void> {
    await this.init();
    await this.store.flush();
  }
  getPrefix(): string {
    return this.prefix;
  }
}
