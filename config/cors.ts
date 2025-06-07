import { CorsConfig } from "../vendor/honovel/framework/src/@hono-types/declaration/imain.d.ts";

const constant: CorsConfig = {
  paths: ["api/*"],
  allowed_methods: ["GET", "POST", "PUT", "DELETE"],
  allowed_origins: env("ORIGINS", ['*']),
  allowed_origins_patterns: [],
  allowed_headers: ["Content-Type", "Authorization", "Accept"],
  exposed_headers: [],
  max_age: 3600,
  supports_credentials: true,
};

export default constant;
