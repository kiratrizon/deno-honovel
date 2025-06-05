import { LogConfig } from "../vendor/honovel/framework/src/@hono-types/declaration/imain.d.ts";

export default {
  default: env("LOG_CHANNEL", "stack"),
  channels: {
    stack: {
      driver: "stack",
      channels: ["daily", "stderr"],
    },
    daily: {
      driver: "daily",
      path: basePath("storage/logs/app.log"),
      days: 14,
    },
    stderr: {
      driver: "stderr",
    },
  },
} as LogConfig;
