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
    if (!(await pathExist(filePath))) {
      return null; // Key does not exist
    }

    const fileContent = getFileContents(filePath);
    if (!fileContent) {
      return null; // File is empty or does not exist
    }
    const cacheItem = jsonDecode(fileContent);
    if (cacheItem.expiresAt && time() > cacheItem.expiresAt) {
      // Item has expired
      Deno.removeSync(filePath); // Optionally remove expired item
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
    writeFile(filePath, jsonEncode(cacheItem));
  }

  async forget(key: string): Promise<void> {
    // Implement logic to remove key from file cache
    const newKey = this.validateFilePath(this.validateKey(key));
    await this.init();
    const filePath = path.join(
      path.normalize(this.path),
      path.normalize(`${newKey}.cache.json`),
    );
    if (await pathExist(filePath)) {
      Deno.removeSync(filePath);
    }
  }

  async flush(): Promise<void> {
    // Implement logic to clear all items in the file cache
    await this.init();
    const files = Deno.readDirSync(this.path);
    for (const file of files) {
      if (
        file.isFile &&
        file.name.endsWith(".cache.json") &&
        file.name.startsWith(this.prefix)
      ) {
        Deno.removeSync(
          path.join(path.normalize(this.path), path.normalize(file.name)),
        );
      }
    }
  }

  #initialized = false;
  private async init() {
    if (this.#initialized) return;
    if (!(await pathExist(this.path))) {
      makeDir(this.path);
    }
    this.#initialized = true;
  }

  getPrefix(): string {
    return this.prefix;
  }
}
