import { LoadOptions } from "dotenv";
import { SupportedDrivers } from "configs/@types/index.d.ts";

import * as path from "node:path";

export default {
  envPath: path.join(Deno.cwd(), ".env").replace(/\\/g, "/"),
  examplePath: null,
} as LoadOptions; // don't delete

export const envs = [
  ".env",
  ".env.example",
  ".env.production",
  ".env.development",
  ".env.test",
];

// export your interface "ImportEnv" here

export interface ImportEnvConfig {
  readonly ORIGINS: string[];
  readonly REDIS_URL: string;
  readonly UPSTASH_REDIS_REST_URL: string;
  readonly UPSTASH_REDIS_REST_TOKEN: string;
  /**
   * The system's default timezone when using date(), strToTime() and Carbon functions.
   * e.g. "America/New_York", "Europe/London", "UTC", GMT, etc.
   */
  readonly TIMEZONE: string;
  readonly JWT_SECRET_KEY: string;
  readonly SESSION_COOKIE: string;
  readonly PORT: number;
  readonly REDIS_CLIENT: "ioredis" | "upstash" | "node-redis" | "deno-redis";
  readonly SESSION_CONNECTION: SupportedDrivers;
}

// define your interface "ImportSession" here
export type ImportSession = {};
