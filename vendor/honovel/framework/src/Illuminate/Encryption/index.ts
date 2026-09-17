export class EnvUpdater {
  /**
   * Set or remove specific key in .env file
   */

  public static setEnv({
    key,
    value,
    force,
    envPath = ".env",
  }: {
    key: string;
    value: string;
    force?: boolean;
    envPath?: string;
  }) {
    if (!isset(key) || !isset(value)) {
      throw new Error(`key and value must be present`);
    }
    const prevKey = `PREVIOUS_${key}`;

    const envFile = basePath(envPath);
    let envContent = "";

    try {
      envContent = Deno.readTextFileSync(envFile);
    } catch {
      // File does not exist
    }

    const keyMatch = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
    const prevKeysMatch = envContent.match(
      new RegExp(`^${prevKey}=(.*)$`, "m"),
    );
    const existingKey = keyMatch?.[1]?.trim();

    if (existingKey && keyMatch && !force) {
      console.info(`${key} already exists in ".env". Use force to overwrite.`);
      return;
    }

    if (existingKey) {
      let prevKeys = prevKeysMatch
        ? prevKeysMatch[1].trim().replace(/^"|"$/g, "")
        : "";

      if (!prevKeys.split(",").includes(existingKey)) {
        prevKeys = prevKeys ? `${prevKeys},${existingKey}` : existingKey;
      }

      if (prevKeysMatch) {
        envContent = envContent.replace(
          new RegExp(`^${prevKey}=.*$`, "m"),
          `${prevKey}="${prevKeys}"`,
        );
      } else {
        envContent += `\n${prevKey}="${prevKeys}"`;
      }
    }

    // ✅ Replace or append APP_KEY
    if (keyMatch) {
      envContent = envContent.replace(
        new RegExp(`^${key}=.*$`, "m"),
        `${key}="${value}"`,
      );
    } else {
      if (envContent.trim() !== "") envContent += "\n";
      envContent += `${key}=${value}`;
    }

    Deno.writeTextFileSync(envFile, envContent);

    console.log(`${key} generated and saved to ".env"`);

    if (force && existingKey) {
      console.info(`Old key stored in ${prevKey} inside ".env"`);
    }
  }
}
