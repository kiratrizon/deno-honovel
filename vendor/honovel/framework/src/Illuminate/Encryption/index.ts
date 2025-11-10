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
      // If file doesn't exist, we start fresh
    }

    const appKeyMatch = envContent.match(/^APP_KEY=(.*)$/m);
    const prevKeysMatch = envContent.match(/^PREVIOUS_KEYS=(.*)$/m);

    if (appKeyMatch) {
      if (!force) {
        consoledeno.info(
          `APP_KEY already exists in ${envPath}. Use force to overwrite.`
        );
        return;
      }

      const oldKey = appKeyMatch[1].trim();
      let prevKeys = prevKeysMatch
        ? prevKeysMatch[1].trim().replace(/^"|"$/g, "")
        : "";

      // Append old key to PREVIOUS_KEYS if not already present
      if (!prevKeys.split(",").includes(oldKey)) {
        prevKeys = prevKeys ? `${prevKeys},${oldKey}` : oldKey;
      }

      if (prevKeysMatch) {
        envContent = envContent.replace(
          /^PREVIOUS_KEYS=.*$/m,
          `PREVIOUS_KEYS="${prevKeys}"`
        );
      } else {
        envContent += `\nPREVIOUS_KEYS="${prevKeys}"`;
      }

      // Replace APP_KEY
      envContent = envContent.replace(/^APP_KEY=.*$/m, `APP_KEY=${appKey}`);
    } else {
      // APP_KEY not found — just add it
      if (envContent.trim() !== "") envContent += "\n";
      envContent += `APP_KEY=${appKey}`;
    }

    // Save changes
    Deno.writeTextFileSync(envFile, envContent);
    consoledeno.success(`App key generated and saved to ${envPath}`);
    if (force && appKeyMatch) {
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
    const envFile = envPath == ".env" ? basePath(envPath) : envPath;
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
