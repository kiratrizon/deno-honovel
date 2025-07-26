// file
// redis
// object
// database
// memacached
// dynamodb
// null

import { Carbon } from "honovel:helpers";
import { RedisClient } from "configs/@types/index.d.ts";
import { RedisManager } from "../Redis/index.ts";

export abstract class AbstractStore {
    abstract get(key: string): Promise<any>;
    abstract put(key: string, value: any, seconds: number): Promise<void>;
    abstract forget(key: string): Promise<void>;
    abstract flush(): Promise<void>;
    abstract getPrefix(): string;

    /**
     * Store an item in the cache indefinitely.
     */
    async forever(key: string, value: any): Promise<void> {
        // Convention: use 0 or -1 to mean "forever"
        await this.put(key, value, 0);
    }

    /**
     * Increment the value of an item in the cache.
     */
    async increment(key: string, value: number = 1): Promise<number | null> {
        const current = await this.get(key);
        if (typeof current === "number") {
            const newVal = current + value;
            await this.put(key, newVal, 0);
            return newVal;
        }
        return null;
    }

    /**
     * Decrement the value of an item in the cache.
     */
    async decrement(key: string, value: number = 1): Promise<number | null> {
        const current = await this.get(key);
        if (typeof current === "number") {
            const newVal = current - value;
            await this.put(key, newVal, 0);
            return newVal;
        }
        return null;
    }

    /**
     * Get a value or return default.
     */
    async getOrDefault<T = any>(key: string, defaultValue: T): Promise<T> {
        const value = await this.get(key);
        return value !== null && value !== undefined ? value : defaultValue;
    }

    /**
     * Check if a key exists in cache.
     */
    async has(key: string): Promise<boolean> {
        const value = await this.get(key);
        return isset(value);
    }

    protected validateKey(key: string): string {
        if (!isset(key) || empty(key) || !isString(key)) {
            throw new Error(`Key must be a non-empty string`);
        }
        if (key.includes(' ')) {
            throw new Error(`Key cannot contain spaces: "${key}"`);
        }
        if (!key.trim()) {
            throw new Error(`Key cannot be an empty string`);
        }
        const newKey = this.getPrefix() + key;
        return newKey;
    }
}

class FileStore extends AbstractStore {
    private readonly prefix: string;
    private path: string;
    constructor(opts: { prefix: string, path?: string } = {
        prefix: '',
    }) {
        super();
        this.prefix = opts.prefix;
        if (!isset(opts.path) || empty(opts.path) || !isString(opts.path)) {
            throw new Error("FileStore requires a valid path.");
        }
        this.path = opts.path;
    }

    async get(key: string): Promise<any> {
        // Implement logic to retrieve value from file cache
        const newKey = this.validateKey(key);
        await this.init();
        // For example, read from a JSON file or similar
        const filePath = `${this.path}/${newKey}.cache.json`;
        if (!pathExist(filePath)) {
            return null; // Key does not exist
        }

        const fileContent = getFileContents(filePath);
        if (!fileContent) {
            return null; // File is empty or does not exist
        }
        const cacheItem = jsonDecode(fileContent);
        if (cacheItem.expiresAt && strToTime("now")! > cacheItem.expiresAt) {
            // Item has expired
            Deno.removeSync(filePath); // Optionally remove expired item
            return null;
        }
        return cacheItem.value; // Return the cached value
    }

    async put(key: string, value: any, seconds: number): Promise<void> {
        // Implement logic to store value in file cache
        const newKey = this.validateKey(key);
        await this.init();
        // Logic to write value to a file, possibly with expiration logic
        const expiresAt = seconds > 0 ? strToTime(Carbon.now().addSeconds(seconds)) : null;
        const cacheItem = {
            value: value,
            expiresAt: expiresAt
        };

        const filePath = `${this.path}/${newKey}.cache.json`;
        writeFile(filePath, jsonEncode(cacheItem));
    }

    async forget(key: string): Promise<void> {
        // Implement logic to remove key from file cache
        const newKey = this.validateKey(key);
        await this.init();
        const filePath = `${this.path}/${newKey}.cache.json`;
        if (pathExist(filePath)) {
            Deno.removeSync(filePath);
        }
    }

    async flush(): Promise<void> {
        // Implement logic to clear all items in the file cache
        await this.init();
        const files = Deno.readDirSync(this.path);
        for (const file of files) {
            if (file.isFile && file.name.endsWith('.cache.json')) {
                Deno.removeSync(`${this.path}/${file.name}`);
            }
        }
    }

    #initialized = false;
    private async init() {
        if (this.#initialized) return;
        if (!pathExist(this.path)) {
            makeDir(this.path);
        }
        this.#initialized = true;
    }

    getPrefix(): string {
        return this.prefix;
    }
}

class RedisStore extends AbstractStore {
    private static redisClient: RedisClient;
    private readonly connection: string;
    private readonly prefix: string;
    // @ts-ignore //
    private manager: RedisManager;
    constructor(opts: { connection: string, prefix: string } = { connection: "default", prefix: "" }) {
        super();
        const dbConf = staticConfig("database");
        if (!RedisStore.redisClient) {
            RedisStore.redisClient = dbConf.redis?.client || "upstash"
        }
        if (!isset(dbConf.redis?.connections)) {
            throw new Error("Redis connections are not configured.");
        }
        this.connection = opts.connection;
        this.prefix = opts.prefix || "";
        if (!isset(dbConf.redis.connections[this.connection || "default"])) {
            throw new Error(`Redis connection "${this.connection}" is not defined in the database config.`);
        }
    }

    #initialized = false;
    private async init() {
        if (this.#initialized || this.manager) return;
        const dbConf = staticConfig("database");
        if (!isset(dbConf.redis)) {
            throw new Error("Redis configuration is not set in the database config.");
        }
        if (!isset(dbConf.redis.connections[this.connection])) {
            throw new Error(`Redis connection "${this.connection}" is not defined.`);
        }
        this.manager = new RedisManager(RedisStore.redisClient);
        await this.manager.init(this.connection);
        // Initialize Redis client here if needed
        this.#initialized = true;
    }
    async get(key: string): Promise<any> {
        await this.init();
        const newKey = this.validateKey(key);
        return await this.manager.get(newKey);
    }

    async put(key: string, value: any, seconds: number): Promise<void> {
        await this.init();
        const newKey = this.validateKey(key);
        await this.manager.set(newKey, value, { ex: seconds > 0 ? seconds : undefined });
    }

    async forget(key: string): Promise<void> {
        await this.init();
        const newKey = this.validateKey(key);
        await this.manager.del(newKey);
    }

    async flush(): Promise<void> {
        await this.init();
        await this.manager.flushAll();
    }

    getPrefix(): string {
        return this.prefix;
    }
}

class ObjectStore extends AbstractStore {
    private store: Record<string, { value: any; expiresAt: number | null }> = {};
    private readonly prefix: string;

    constructor(opts: { prefix?: string } = { prefix: '' }) {
        super();
        this.prefix = opts.prefix || '';
    }

    async get(key: string): Promise<any> {
        const newKey = this.validateKey(key);
        const cacheItem = this.store[newKey];

        if (!cacheItem) return null;

        if (cacheItem.expiresAt && strToTime("now")! > cacheItem.expiresAt) {
            delete this.store[newKey];
            return null;
        }

        return cacheItem.value;
    }

    async put(key: string, value: any, seconds: number): Promise<void> {
        const newKey = this.validateKey(key);

        const expiresAt = seconds > 0
            ? strToTime(Carbon.now().addSeconds(seconds))
            : null;

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



export { FileStore, RedisStore, ObjectStore };