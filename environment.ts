import { LoadOptions } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

export default {
  envPath: ".env",
  examplePath: null,
} as LoadOptions; // don't delete

// export your interface "ImportEnv" here

export interface ImportEnv {
  readonly ORIGINS: string[];
  readonly REDIS_URL: string;
  readonly UPSTASH_REDIS_REST_URL: string;
  readonly UPSTASH_REDIS_REST_TOKEN: string;
}
