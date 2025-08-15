import { Str } from "Illuminate/Support/index.ts";
import { SessionConfig } from "configs/@types/index.d.ts";
const constant: SessionConfig = {
  driver: "database",

  lifetime: env("SESSION_LIFETIME", 120),

  expireOnClose: env("SESSION_EXPIRE_ON_CLOSE", false),

  encrypt: env("SESSION_ENCRYPT", false),

  files: storagePath("framework/sessions"),

  connection: env("SESSION_CONNECTION", "mysql"),

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
};

export default constant;
