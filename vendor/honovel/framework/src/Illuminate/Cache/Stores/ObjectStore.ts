import AbstractStore from "./AbstractStore.ts";
import { Carbon } from "helpers";

export default class ObjectStore extends AbstractStore {
  private store: Record<string, { value: any; expiresAt: number | null }> = {};

  constructor(opts: { prefix?: string } = { prefix: "" }) {
    super(opts.prefix);
    this.warning("Object driver");
  }

  async get(key: string): Promise<any> {
    const newKey = this.validateKey(key);
    const cacheItem = this.store[newKey];

    if (!cacheItem) return null;

    if (cacheItem.expiresAt && time() > cacheItem.expiresAt) {
      delete this.store[newKey];
      return null;
    }

    return cacheItem.value;
  }

  async put(key: string, value: any, seconds: number): Promise<void> {
    const newKey = this.validateKey(key);

    const expiresAt =
      seconds > 0 ? strToTime(Carbon.now().addSeconds(seconds)) : null;

    this.store[newKey] = {
      value,
      expiresAt,
    };
  }

  async forget(key: string): Promise<void> {
    const newKey = this.validateKey(key);
    delete this.store[newKey];
  }

  async flush(): Promise<void> {
    this.store = {};
  }

  getPrefix(): string {
    return this.prefix;
  }
}
