import AbstractStore from "./AbstractStore.ts";
import { Carbon } from "helpers";
import * as path from "node:path";

export default class FileStore extends AbstractStore {
  private path: string;
  constructor(
    opts: { prefix: string; path?: string } = {
      prefix: "",
    },
  ) {
    super(opts.prefix);
    this.warning("File driver", true);
    this.prefix = this.validateFilePath(opts.prefix);
    if (!isset(opts.path) || empty(opts.path) || !isString(opts.path)) {
      throw new Error("FileStore requires a valid path.");
    }
    this.path = opts.path;
  }

  private validateFilePath(filePath: string): string {
    if (Deno.build.os === "windows") {
      return filePath.replace(/[:*?"<>|]/g, "_");
    }
    return filePath;
  }

  async get(key: string): Promise<any> {
    // Implement logic to retrieve value from file cache
    const newKey = this.validateFilePath(this.validateKey(key));
    await this.init();
    // For example, read from a JSON file or similar
    const filePath = path.join(
      path.normalize(this.path),
      path.normalize(`${newKey}.cache.json`),
    );
    let fileContent: string;
    try {
      fileContent = await Deno.readTextFile(filePath);
    } catch {
      return null; // Key does not exist, or file is unreadable
    }
    if (!fileContent) {
      return null; // File is empty
    }
    const cacheItem = jsonDecode(fileContent);
    if (cacheItem.expiresAt && time() > cacheItem.expiresAt) {
      // Item has expired
      await Deno.remove(filePath); // Optionally remove expired item
      return null;
    }
    return cacheItem.value; // Return the cached value
  }

  async put(key: string, value: any, seconds: number): Promise<void> {
    // Implement logic to store value in file cache
    const newKey = this.validateFilePath(this.validateKey(key));
    await this.init();
    // Logic to write value to a file, possibly with expiration logic
    const expiresAt =
      seconds > 0 ? strToTime(Carbon.now().addSeconds(seconds)) : null;
    const cacheItem = {
      value: value,
      expiresAt: expiresAt,
    };

    const filePath = path.join(
      path.normalize(this.path),
      path.normalize(`${newKey}.cache.json`),
    );
    // ask always if the path exist then write the file
    if (!(await pathExistsAsync(filePath))) {
      await Deno.mkdir(path.dirname(filePath), { recursive: true });
    }
    await Deno.writeTextFile(filePath, jsonEncode(cacheItem));
  }

  async forget(key: string): Promise<void> {
    // Implement logic to remove key from file cache
    const newKey = this.validateFilePath(this.validateKey(key));
    await this.init();
    const filePath = path.join(
      path.normalize(this.path),
      path.normalize(`${newKey}.cache.json`),
    );
    try {
      await Deno.remove(filePath);
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
  }

  async flush(): Promise<void> {
    // Implement logic to clear all items in the file cache
    await this.init();
    for await (const file of Deno.readDir(this.path)) {
      if (
        file.isFile &&
        file.name.endsWith(".cache.json") &&
        file.name.startsWith(this.prefix)
      ) {
        await Deno.remove(
          path.join(path.normalize(this.path), path.normalize(file.name)),
        );
      }
    }
  }

  #initialized = false;
  private async init() {
    if (this.#initialized) return;
    if (!(await pathExistsAsync(this.path))) {
      try {
        await Deno.mkdir(this.path, { recursive: true });
      } catch (err) {
        if (!(err instanceof Deno.errors.AlreadyExists)) throw err;
      }
    }
    this.#initialized = true;
  }

  getPrefix(): string {
    return this.prefix;
  }

  async deleteExpired(): Promise<void> {
    await this.init();
    const now = time();
    for await (const file of Deno.readDir(this.path)) {
      if (
        file.isFile &&
        file.name.endsWith(".cache.json") &&
        file.name.startsWith(this.prefix)
      ) {
        const filePath = path.join(
          path.normalize(this.path),
          path.normalize(file.name),
        );
        try {
          const fileValue = jsonDecode(await Deno.readTextFile(filePath));
          if (fileValue?.expiresAt && now > fileValue.expiresAt) {
            await Deno.remove(filePath);
          }
        } catch (error) {
          console.error(`Error deleting file "${file.name}":`, error);
        }
      }
    }
  }
}
