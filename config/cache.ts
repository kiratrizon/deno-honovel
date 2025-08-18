import { CacheConfig } from "configs/@types/index.d.ts";

const constant: CacheConfig = {
  default: env("CACHE_DRIVER", "memory"),
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
    memory: {
      driver: "memory",
    },
    memcached: {
      driver: "memcached",
      servers: [
        {
          host: env("MEMCACHED_HOST", "127.0.0.1"),
          port: env("MEMCACHED_PORT", 11211),
          weight: env("MEMCACHED_WEIGHT", 100),
        },
      ],
    },
    mongo: {
      driver: "mongodb",
      prefix: env("CACHE_PREFIX", "honovel_cache"),
      collection: env("MONGODB_CACHE_COLLECTION", "cache"),
      connection: "mongodb",
    },

    // dynamodb
    dynamo: {
      driver: "dynamodb",
      key: env("AWS_ACCESS_KEY_ID", ""),
      secret: env("AWS_SECRET_ACCESS_KEY", ""),
      region: env("AWS_DEFAULT_REGION", "us-east-1"),
      table: env("AWS_CACHE_TABLE", "honovel_cache"),
      partitionKey: env("AWS_CACHE_PARTITION_KEY", "id"),
    },
  },
};

export default constant;
