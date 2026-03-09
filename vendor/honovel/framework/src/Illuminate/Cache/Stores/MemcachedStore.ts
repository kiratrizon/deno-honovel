import AbstractStore from "./AbstractStore.ts";
import { Carbon } from "helpers";

export default class MemcachedStore extends AbstractStore {
  private readonly servers: {
    host: string;
    port: number;
    weight?: number;
    poolSize?: number;
  }[];
  // @ts-ignore //
  private client: any;

  constructor(opts: {
    prefix?: string;
    servers: { host: string; port: number; weight?: number }[];
  }) {
    super(opts.prefix);
    if (!isset(opts.servers) || !isArray(opts.servers)) {
      throw new Error("MemcachedStore requires a valid servers array.");
    }
    opts.servers.map((server) => {
      // @ts-ignore //
      server.poolSize = server.weight || 5;
      delete server.weight;
      return server;
    });
    this.servers = opts.servers;
  }

  private async init() {
    if (this.client) return; // Already initialized
    try {
      const { Memcached } = await import("@avroit/memcached");
      this.client = new Memcached(this.servers[0]);
    } catch (_error) {
      console.error(
        "Failed to load @avroit/memcached. Please install it using:",
      );
      console.error("  deno task install:driver --cache memcached");
      throw new Error(
        // @ts-ignore //
        _error.message ||
          "MemcachedStore requires @avroit/memcached to be installed.",
      );
    }
  }

  public async get(key: string): Promise<any> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      const value = await this.client.get(newKey);
      if (value === undefined || value === null) {
        return null; // Key does not exist
      }
      return jsonDecode(value); // Return the cached value
    } catch (error) {
      console.error(`Error getting key "${newKey}":`, error);
      return null; // Handle error gracefully
    }
  }

  public async put(key: string, value: any, seconds: number): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      await this.client.set(
        newKey,
        jsonEncode(value),
        seconds > 0 ? seconds : undefined,
      );
    } catch (error) {
      console.error(`Error setting key "${newKey}":`, error);
    }
  }

  public async forget(key: string): Promise<void> {
    await this.init();
    const newKey = this.validateKey(key);
    try {
      await this.client.delete(newKey);
    } catch (error) {
      console.error(`Error deleting key "${newKey}":`, error);
    }
  }

  public async flush(): Promise<void> {
    await this.init();
    try {
      await this.client.flush();
    } catch (error) {
      console.error("Error flushing Memcached store:", error);
    }
  }

  getPrefix(): string {
    return this.prefix;
  }
}
