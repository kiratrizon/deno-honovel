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
        console.log(
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
    console.log(`App key generated and saved to ${envPath}`);
    if (force && appKeyMatch) {
      console.log(`Old key stored in PREVIOUS_KEYS inside ${envPath}`);
    }
  }
}
