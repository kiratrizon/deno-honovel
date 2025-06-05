import { SessionConfig } from "../vendor/honovel/framework/src/hono/Http/HonoSession.ts";

export default {
  driver: env("SESSION_DRIVER", "memory"),

  lifetime: env("SESSION_LIFETIME", 120),

  // @ts-ignore //
  encrypt: true,

  files: storagePath("framework/sessions"),

  // @ts-ignore //
  cookie: env("SESSION_COOKIE", "honovel_session"),

  path: "/",

  // @ts-ignore //
  domain: env("SESSION_DOMAIN", null),

  // @ts-ignore //
  secure: env("SESSION_SECURE_COOKIE", false),

  httpOnly: true,

  // @ts-ignore //
  sameSite: env("SESSION_SAME_SITE", "lax"),

  // @ts-ignore //
  connection: env("SESSION_CONNECTION", "default"),

  // @ts-ignore //
  prefix: env("SESSION_PREFIX", "sess:"),
} as SessionConfig;
