export class Encrypter {
  public static generateAppKey(envPath: string = ".env", force = false) {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const binary = String.fromCharCode(...key);
    const base64Key = btoa(binary);
    const appKey = `base64:${base64Key}`;

    const envFile = basePath(envPath);
    let envContent = "";

    try {
      envContent = Deno.readTextFileSync(envFile);
    } catch {
      // File does not exist
    }

    const appKeyMatch = envContent.match(/^APP_KEY=(.*)$/m);
    const prevKeysMatch = envContent.match(/^PREVIOUS_KEYS=(.*)$/m);
    const existingKey = appKeyMatch?.[1]?.trim();

    // ✅ If key exists AND is not empty AND not forcing → skip
    if (existingKey && appKeyMatch && !force) {
      consoledeno.info(
        `APP_KEY already exists in ${envPath}. Use force to overwrite.`
      );
      return;
    }

    // ✅ Handle previous key only if it was a real one
    if (existingKey) {
      let prevKeys = prevKeysMatch
        ? prevKeysMatch[1].trim().replace(/^"|"$/g, "")
        : "";

      if (!prevKeys.split(",").includes(existingKey)) {
        prevKeys = prevKeys ? `${prevKeys},${existingKey}` : existingKey;
      }

      if (prevKeysMatch) {
        envContent = envContent.replace(
          /^PREVIOUS_KEYS=.*$/m,
          `PREVIOUS_KEYS="${prevKeys}"`
        );
      } else {
        envContent += `\nPREVIOUS_KEYS="${prevKeys}"`;
      }
    }

    // ✅ Replace or append APP_KEY
    if (appKeyMatch) {
      envContent = envContent.replace(/^APP_KEY=.*$/m, `APP_KEY=${appKey}`);
    } else {
      if (envContent.trim() !== "") envContent += "\n";
      envContent += `APP_KEY=${appKey}`;
    }

    Deno.writeTextFileSync(envFile, envContent);

    consoledeno.success(`App key generated and saved to ${envPath}`);

    if (force && existingKey) {
      consoledeno.info(`Old key stored in PREVIOUS_KEYS inside ${envPath}`);
    }
  }
}

export class EnvUpdater {
  /**
   * Set or remove APP_URL in a .env file
   * @param envPath Path to .env file
   * @param appUrl Value to set. If null, APP_URL is removed
   */
  public static updateAppUrl(
    envPath: string = ".env",
    appUrl: string | null = null
  ) {
    const envFile =
      envPath.split("/").length === 1 ? basePath(envPath) : envPath;
    let envContent = "";
    try {
      envContent = Deno.readTextFileSync(envFile);
    } catch {
      // If file doesn't exist, we start fresh
    }

    const appUrlMatch = envContent.match(/^APP_URL=.*$/m);

    if (appUrl === null) {
      // Remove APP_URL if it exists
      if (appUrlMatch) {
        envContent = envContent.replace(/^APP_URL=.*$/m, "").trim();
      }
    } else {
      // Add or replace APP_URL
      if (appUrlMatch) {
        envContent = envContent.replace(/^APP_URL=.*$/m, `APP_URL=${appUrl}`);
      } else {
        if (envContent.trim() !== "") envContent += "\n";
        envContent += `APP_URL=${appUrl}`;
      }
    }

    // Save changes
    Deno.writeTextFileSync(envFile, envContent);
  }
}
