import { Str } from "Illuminate/Support";
import { SessionConfig } from "./@types/index.d.ts";
export default {
  driver: env("SESSION_DRIVER", "memory"),

  lifetime: env("SESSION_LIFETIME", 120),

  encrypt: false,

  files: storagePath("framework/sessions"),

  path: "/",

  domain: env("SESSION_DOMAIN", null),

  secure: env("SESSION_SECURE_COOKIE", false),

  httpOnly: true,

  sameSite: env("SESSION_SAME_SITE", "lax"),

  connection: env("SESSION_CONNECTION", "default"),

  prefix: env("SESSION_PREFIX", "sess:"),

  cookie: env(
    "SESSION_COOKIE",
    Str.slug(env("APP_NAME", "Honovel"), "_") + "_session"
  ),
} as SessionConfig;
