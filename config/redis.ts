import { RedisConfig } from "../vendor/honovel/framework/src/hono/Http/HonoSession.ts";

export default {
  // @ts-ignore //
  default: env("REDIS_CONNECTION", "default"),

  connections: {
    default: {
      host: env("REDIS_HOST", "127.0.0.1"),
      port: env("REDIS_PORT", 6379),
      password: env("REDIS_PASSWORD", ""),
      url: env("REDIS_URL", null),
      upstash: {
        url: env("UPSTASH_REDIS_REST_URL"),
        token: env("UPSTASH_REDIS_REST_TOKEN"),
      },
    },

    cache: {
      // @ts-ignore //
      host: env("REDIS_CACHE_HOST", "127.0.0.1"),
      // @ts-ignore //
      port: Number(env("REDIS_CACHE_PORT", 6379)),
      // @ts-ignore //
      password: env("REDIS_CACHE_PASSWORD", ""),
      // @ts-ignore //
    },
  },
} as RedisConfig;
