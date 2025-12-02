/// <reference path="./index.d.ts" />

import { CacheDriver } from "configs/@types/index.d.ts";
import { ImportEnvConfig } from "../../../environment.ts";

export {};
declare global {
  interface EnvConfig extends ImportEnvConfig {
    readonly DENO_REGION?: string;
    readonly DENO_DEPLOYMENT_ID?: string;
    readonly APP_NAME: string;
    readonly APP_ENV: "local" | "production" | "staging" | "testing";
    readonly APP_KEY: string;
    readonly APP_DEBUG: boolean;
    readonly APP_PORT: number;
    readonly APP_URL: string;
    readonly LOG_CHANNEL: string;
    readonly LOG_LEVEL:
      | "debug"
      | "info"
      | "notice"
      | "warning"
      | "error"
      | "critical"
      | "alert"
      | "emergency";
    readonly DB_CONNECTION: string;
    readonly DB_HOST: string;
    readonly DB_PORT: number;
    readonly DB_DATABASE: string;
    readonly DB_USERNAME: string;
    readonly DB_PASSWORD: string;

    readonly BROADCAST_DRIVER: string;
    readonly CACHE_DRIVER: string;
    readonly QUEUE_CONNECTION: string;
    readonly SESSION_DRIVER:
      | Exclude<CacheDriver, "dynamodb" | "mongodb">
      | "cache";
    readonly SESSION_LIFETIME: number;
    readonly MEMCACHED_HOST: string;
    readonly MAIL_MAILER: string;
    readonly MAIL_HOST: string;
    readonly MAIL_PORT: number;
    readonly MAIL_USERNAME: string | null;
    readonly MAIL_PASSWORD: string | null;
    readonly MAIL_ENCRYPTION: "tls" | "ssl" | null;
    readonly MAIL_FROM_ADDRESS: string;
    readonly MAIL_FROM_NAME: string;
    readonly AWS_ACCESS_KEY_ID: string;
    readonly AWS_SECRET_ACCESS_KEY: string;
    readonly AWS_DEFAULT_REGION: string;
    readonly AWS_BUCKET: string;
    readonly PUSHER_APP_ID: string;
    readonly PUSHER_APP_KEY: string;
    readonly PUSHER_APP_SECRET: string;
    readonly PUSHER_HOST: string;
    readonly PUSHER_PORT: number;
    readonly PUSHER_SCHEME: "http" | "https";
    readonly PUSHER_APP_CLUSTER: string;
    readonly VITE_APP_NAME: string;
  }
}
