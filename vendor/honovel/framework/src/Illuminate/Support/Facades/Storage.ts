import { PublicDiskConfig } from "configs/@types/index.d.ts";

export interface IStorage {
  /**
   * Save a file to storage
   * @param path - path inside the storage disk
   * @param contents - file content (string or Uint8Array)
   */
  put(path: string, contents: Uint8Array): Promise<void> | void;

  /**
   * Get the contents of a file
   * @param path - path inside the storage disk
   */
  get(path: string, raw: true): Promise<Uint8Array>;
  get(path: string, raw?: false): Promise<string>;

  /**
   * Delete a file
   * @param path - path inside the storage disk
   */
  delete(path: string): Promise<void> | void;

  /**
   * Check if a file exists
   * @param path - path inside the storage disk
   */
  exists(path: string): Promise<boolean> | boolean;

  /**
   * Get the URL of a file
   * @param path - path inside the storage disk
   */
  getUrl(path: string): string;
}

class Storage {
  static #storage: Record<string, IStorage> = {};

  static disk(disk: string): IStorage {
    if (this.#storage[disk]) {
      return this.#storage[disk];
    }
    const storageInstance = this.generateStorage(disk);
    this.#storage[disk] = storageInstance;
    return storageInstance;
  }

  private static generateStorage(disk: string): IStorage {
    const filesystems = config("filesystems") || {};
    const disks = filesystems.disks || {};
    if (!disks[disk]) {
      throw new Error(`Disk ${disk} is not configured.`);
    }

    const diskConfig = disks[disk];
    switch (diskConfig.driver) {
      case "public":
        return new PublicStorage(diskConfig as PublicDiskConfig);
      default:
        throw new Error(
          `Storage driver ${diskConfig.driver} is not supported.`
        );
    }
  }
}

class PublicStorage implements IStorage {
  constructor(private setup: PublicDiskConfig) {
    if (!setup) {
      throw new Error("Public disk configuration is invalid");
    }
    if (setup.driver.toLowerCase() !== "public") {
      throw new Error("PublicStorage only supports 'public' driver");
    }
    if (!setup.root) {
      throw new Error("Public disk configuration must have a root path");
    }

    if (setup.visibility !== "public") {
      throw new Error("PublicStorage only supports 'public' visibility");
    }

    if (!setup.url) {
      throw new Error("Public disk configuration must have a URL");
    }
  }

  private getFullPath(path: string): string {
    return `${this.setup.root}/${path}`;
  }

  async put(path: string, contents: Uint8Array): Promise<void> {
    const fullPath = this.getFullPath(path);
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

    await Deno.mkdir(dir, { recursive: true });

    await Deno.writeFile(fullPath, contents);
  }

  async delete(path: string): Promise<void> {
    const fullPath = this.getFullPath(path);
    await Deno.remove(fullPath);
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = this.getFullPath(path);
    try {
      await Deno.stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async get(path: string, raw: true): Promise<Uint8Array>;
  async get(path: string, raw?: false): Promise<string>;
  async get(path: string, raw?: boolean): Promise<string | Uint8Array> {
    const fullPath = this.getFullPath(path);
    if (raw === true) {
      return await Deno.readFile(fullPath);
    } else {
      const decoder = new TextDecoder("utf-8");
      const data = await Deno.readFile(fullPath);
      return decoder.decode(data);
    }
  }

  getUrl(path: string): string {
    return `${env("APP_URL")}${this.setup.url}/${path}`;
  }
}
export default Storage;
