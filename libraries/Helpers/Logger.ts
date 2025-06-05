import * as path from "https://deno.land/std/path/mod.ts";
import { LogConfig } from "../../vendor/honovel/framework/src/@hono-types/declaration/imain.d.ts";

class Logger {
  public static log(
    // deno-lint-ignore no-explicit-any
    value: any,
    destination: string = "",
    identifier: string = ""
  ) {
    const logging = staticConfig("logging") as LogConfig;
    const defaultChannel = destination || logging.default;
    const channels = logging.channels;

    const timestamp = date("Y-m-d H:i:s");
    const logMessage = `${timestamp} ${identifier}\n${
      typeof value === "object" ? JSON.stringify(value, null, 2) : value
    }\n\n`;

    const logToChannel = (channel: string) => {
      const conf = channels[channel];
      if (!conf) return;

      switch (conf.driver) {
        case "single": {
          const filePath = tmpPath(conf.path);
          const dir = path.dirname(filePath);
          if (!pathExist(dir)) makeDir(dir);
          if (!pathExist(filePath)) writeFile(filePath, "");
          appendFile(filePath, logMessage);
          break;
        }

        case "daily": {
          const dateStr = date("Y-m-d");
          const filePath = tmpPath(`${conf.path}/${dateStr}.log`);
          const dir = path.dirname(filePath);
          if (!pathExist(dir)) makeDir(dir);
          if (!pathExist(filePath)) writeFile(filePath, "");
          appendFile(filePath, logMessage);
          break;
        }

        case "console": {
          console.log(logMessage);
          break;
        }

        case "stack": {
          for (const ch of conf.channels || []) {
            logToChannel(ch);
          }
          break;
        }
      }
    };

    logToChannel(defaultChannel);
  }
}

export default Logger;
