import * as path from "https://deno.land/std@0.224.0/path/mod.ts";

class Logger {
  public static log(
    value: any,
    destination: string = "",
    identifier: string = ""
  ) {
    const logging = config("logging");
    const defaultChannel = destination || logging.default;
    const channels = logging.channels;

    const timestamp = date("Y-m-d H:i:s");
    const logMessage = `${timestamp} ${identifier}\n${
      typeof value === "object" ? JSON.stringify(value, null, 2) : value
    }\n\n`;

    if (!empty(env("DENO_DEPLOYMENT_ID", ""))) {
      console.log(logMessage);
      return;
    }
  }
}

export default Logger;
