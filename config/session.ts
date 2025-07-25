import { Str } from "Illuminate/Support";
import { SessionConfig } from "./@types/index.d.ts";
export default {
  driver: env("SESSION_DRIVER", "database"),

  lifetime: env("SESSION_LIFETIME", 120),

  expireOnClose: env("SESSION_EXPIRE_ON_CLOSE", false),

  encrypt: env("SESSION_ENCRYPT", false),

  files: storagePath("framework/sessions"),

  connection: env("SESSION_CONNECTION"),

  table: env("SESSION_TABLE", "sessions"),

  store: env("SESSION_STORE"),

  lottery: [2, 100],

  cookie: env(
    "SESSION_COOKIE",
    Str.snake(env("APP_NAME", "honovel")) + "_session"
  ),

  path: env("SESSION_PATH", "/"),

  domain: env("SESSION_DOMAIN"),

  secure: env("SESSION_SECURE_COOKIE", true),

  httpOnly: env("SESSION_HTTP_ONLY", true),

  sameSite: env("SESSION_SAME_SITE", "lax"),

  partitioned: env("SESSION_PARTITIONED_COOKIE", false),
} as SessionConfig;
