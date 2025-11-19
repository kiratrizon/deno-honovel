import { CorsConfig } from "configs/@types/index.d.ts";

const constant: CorsConfig = {
  paths: ["/api/*", "/web/*"],
  allowed_methods: ["GET", "POST", "PUT", "DELETE"],
  allowed_origins: env("ORIGINS", []),
  allowed_origins_patterns: [],
  allowed_headers: ["Content-Type", "Authorization", "Accept"],
  exposed_headers: [],
  max_age: 3600,
  supports_credentials: true,
};

export default constant;
