import {
  LocalDiskConfig,
  PublicDiskConfig,
  S3DiskConfig,
} from "configs/@types/index.d.ts";

export declare class IStorage {
  /**
   * Save a file to storage
   * @param path - path inside the storage disk
   * @param contents - file content (string or Uint8Array)
   */
  put(path: string, contents: Uint8Array): Promise<string>;

  /**
   * Get the contents of a file
   * @param path - path inside the storage disk
   */
  get(path: string): Promise<Uint8Array>;

  /**
   * Delete a file
   * @param path - path inside the storage disk
   */
  delete(path: string): Promise<void>;

  /**
   * Check if a file exists
   * @param path - path inside the storage disk
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get the URL of a file
   * @param path - path inside the storage disk
   */
  getUrl(path: string): string;
}

class Storage {
  static #storage: Record<string, IStorage> = {};

  /**
   * Get the storage instance for the specified disk.
   * @param disk The disk to use
   * @returns The storage instance for the specified disk
   */
  static disk(disk: string): IStorage {
    if (this.#storage[disk]) {
      return this.#storage[disk];
    }
    const storageInstance = this.generateStorage(disk);
    this.#storage[disk] = storageInstance;
    return storageInstance;
  }

  protected static warning(diskDriver: string, err: boolean = false) {
    if (config("app").env !== "local") {
      const message = `${diskDriver} storage driver is not ${err ? "recommended" : "allowed"} for production environments.`;
      if (err) {
        throw new Error(message);
      } else {
        consoledeno.warn(message);
      }
    }
  }
  private static generateStorage(disk?: string): IStorage {
    const filesystems = config("filesystems") || {};
    const disks = filesystems.disks || {};
    if (!disk) {
      disk = filesystems.default;
    }
    if (!disk) {
      throw new Error("No default filesystem disk is configured.");
    }
    if (!disks[disk]) {
      throw new Error(`Disk ${disk} is not configured.`);
    }

    const diskConfig = disks[disk];
    switch (diskConfig.driver) {
      case "public":
        this.warning("Public driver", true);
        return new PublicStorage(diskConfig as PublicDiskConfig);
      case "local":
        this.warning("Local driver", true);
        return new LocalStorage(diskConfig as LocalDiskConfig);
      case "s3":
        return new S3Storage(diskConfig as S3DiskConfig);
      case "custom":
        return new diskConfig.class();
      default:
        throw new Error(`Storage driver for ${disk} is not supported.`);
    }
  }

  /**
   * Save a file to storage
   * @param path - path inside the storage disk
   * @param contents - file content (string or Uint8Array)
   * @returns - the URL of the stored file
   */
  public static async put(path: string, contents: Uint8Array): Promise<string> {
    const storage = this.generateStorage();
    return await storage.put(path, contents);
  }

  /**
   * Get the contents of a file
   * @param path - path inside the storage disk
   */
  public static async get(path: string): Promise<Uint8Array> {
    const storage = this.generateStorage();
    return await storage.get(path);
  }

  /**
   * Delete a file
   * @param path - path inside the storage disk
   * @returns
   */
  public static async delete(path: string): Promise<void> {
    const storage = this.generateStorage();
    return await storage.delete(path);
  }

  /**
   * Check if a file exists
   * @param path - path inside the storage disk
   * @returns
   */
  public static async exists(path: string): Promise<boolean> {
    const storage = this.generateStorage();
    return await storage.exists(path);
  }

  /**
   * Get the URL of a file
   * @param path - path inside the storage disk
   * @returns - the URL of the file
   */
  public static getUrl(path: string): string {
    const storage = this.generateStorage();
    return storage.getUrl(path);
  }
}

export default Storage;

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

  async put(path: string, contents: Uint8Array): Promise<string> {
    const fullPath = this.getFullPath(path);
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

    await Deno.mkdir(dir, { recursive: true });

    await Deno.writeFile(fullPath, contents);
    return this.getUrl(path);
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

  async get(path: string): Promise<Uint8Array> {
    const fullPath = this.getFullPath(path);
    return await Deno.readFile(fullPath);
  }

  getUrl(path: string): string {
    return `${this.setup.url}/${path}`;
  }
}

class LocalStorage implements IStorage {
  constructor(private setup: LocalDiskConfig) {
    if (!setup) {
      throw new Error("Local disk configuration is invalid");
    }
    if (setup.driver.toLowerCase() !== "local") {
      throw new Error("LocalStorage only supports 'local' driver");
    }
    if (!setup.root) {
      throw new Error("Local disk configuration must have a root path");
    }
  }

  private getFullPath(path: string): string {
    return `${this.setup.root}/${path}`;
  }

  async put(path: string, contents: Uint8Array): Promise<string> {
    const fullPath = this.getFullPath(path);
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeFile(fullPath, contents);
    return this.getUrl(path);
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

  async get(path: string): Promise<Uint8Array> {
    const fullPath = this.getFullPath(path);
    return await Deno.readFile(fullPath);
  }

  /**
   * Local storage paths are NOT public — return local filesystem full path
   */
  getUrl(path: string): string {
    return this.getFullPath(path);
  }
}

// s3
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

class S3Storage implements IStorage {
  #S3Client: S3Client;

  constructor(private setup: S3DiskConfig) {
    if (!setup) throw new Error("S3 disk configuration is invalid");
    if (setup.driver.toLowerCase() !== "s3")
      throw new Error("S3Storage only supports 's3' driver");
    if (!setup.bucket || !setup.key || !setup.secret || !setup.region) {
      throw new Error(
        "S3 disk configuration must have bucket, key, secret and region"
      );
    }

    this.#S3Client = new S3Client({
      region: setup.region,
      credentials: {
        accessKeyId: setup.key,
        secretAccessKey: setup.secret,
      },
    });
  }

  getUrl(path: string): string {
    if (this.setup.url) return `${this.setup.url}/${path}`;
    return `https://${this.setup.bucket}.s3.${this.setup.region}.amazonaws.com/${path}`;
  }

  async put(path: string, contents: Uint8Array): Promise<string> {
    await this.#S3Client.send(
      new PutObjectCommand({
        Bucket: this.setup.bucket,
        Key: path,
        Body: contents,
      })
    );
    return this.getUrl(path);
  }

  async get(path: string): Promise<Uint8Array> {
    const result = await this.#S3Client.send(
      new GetObjectCommand({
        Bucket: this.setup.bucket,
        Key: path,
      })
    );

    const reader = (result.Body as any)[Symbol.asyncIterator]();
    const chunks: Uint8Array[] = [];

    for await (const chunk of reader) {
      chunks.push(new Uint8Array(chunk));
    }

    // Combine all chunks into one Uint8Array
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const buffer = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    return buffer;
  }

  async delete(path: string): Promise<void> {
    await this.#S3Client.send(
      new DeleteObjectCommand({
        Bucket: this.setup.bucket,
        Key: path,
      })
    );
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.#S3Client.send(
        new HeadObjectCommand({
          Bucket: this.setup.bucket,
          Key: path,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}
