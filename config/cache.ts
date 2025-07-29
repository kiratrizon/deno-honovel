import { CacheConfig } from "./@types/index.d.ts";

const constant: CacheConfig = {
  default: env("CACHE_DRIVER", "file"),
  stores: {
    file: {
      driver: "file",
      path: storagePath("framework/cache/data"),
    },
    redis: {
      driver: "redis",
      connection: env("REDIS_CONNECTION", "default"),
      prefix: env("CACHE_PREFIX", "honovel_cache"),
    },
    mydb: {
      driver: "database",
      connection: env("DB_CONNECTION", "default"),
      table: "cache",
      prefix: env("CACHE_PREFIX", "honovel_cache"),
    },
  },
};

export default constant;
