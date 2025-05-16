class Logger {
  public static log(
    // deno-lint-ignore no-explicit-any
    value: any,
    destination: string = "debug",
    identifier: string = ""
  ) {
    const dirPath = tmpPath(`logs`);
    const logPath = `${dirPath}/${destination}.log`;
    const timestamp = date("Y-m-d H:i:s");
    const logMessage = `${timestamp} ${identifier}\n${
      typeof value === "object" ? JSON.stringify(value, null, 2) : value
    }\n\n`;
    if (!pathExist(dirPath)) {
      makeDir(dirPath);
    }
    if (!pathExist(logPath)) {
      // init write
      writeFile(logPath, "");
    }
    if (IN_PRODUCTION) {
      console.log(logMessage);
      return;
    }

    appendFile(logPath, logMessage);
  }
}

export default Logger;
