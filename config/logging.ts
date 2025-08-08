import { LogConfig } from "configs/@types/index.d.ts";

const constant: LogConfig = {
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
};

export default constant;
