import { Hono } from "hono";

// for Context
export type Variables = {
  message: string;
  httpHono: HttpHono;
};

export type HonoType = Hono<{
  Variables: Variables;
}>;

export interface CorsConfig {
  paths?: string[];
  allowed_methods?: string[];
  allowed_origins?: string[];
  allowed_origins_patterns?: string[];
  allowed_headers?: string[];
  exposed_headers?: string[];
  max_age?: number;
  supports_credentials?: boolean;
}
