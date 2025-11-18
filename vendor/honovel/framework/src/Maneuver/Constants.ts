import { IConstants } from "../../../@types/declaration/IConstants.d.ts";

class Constants implements IConstants {
  #configStore: Record<string, any>;
  constructor(configStore: Record<string, any>) {
    this.#configStore = { ...configStore };
  }

  /**
   * Reads configuration values from the config directory based on a dot-notation string.
   * Example: "auth.providers.user.driver" reads the corresponding nested property.
   *
   * @param key - Dot-separated string indicating the config path.
   * @returns A requested configuration value or null if not found.
   */
  public read(key: string, defaultValue: any = null) {
    if (this.#configStore === undefined) {
      throw new Error("Config store is not initialized");
    }

    const keys = key.split(".");
    if (!keys.length) {
      return defaultValue;
    }
    const firstKey: string = keys.shift()!;
    if (!this.#configStore[firstKey]) {
      return defaultValue;
    }
    let currentValue: any = this.#configStore[firstKey];

    while (
      keys.length &&
      (Array.isArray(currentValue) || typeof currentValue === "object")
    ) {
      const nextKey: string = keys.shift()!;
      if (Array.isArray(currentValue)) {
        // if nextKey is parsable as number, parse it
        const parsedKey = parseInt(nextKey);
        if (!isNaN(parsedKey)) {
          currentValue = currentValue[parsedKey];
        }
      } else {
        currentValue = currentValue[nextKey];
      }
    }

    return currentValue ?? defaultValue;
  }

  /**
   * Writes a value to the specified config path in the in-memory store.
   * If the config file hasn't been read yet, it will first attempt to load it.
   *
   * @param key - Dot-separated string indicating where to write.
   * @param data - The value to store at the given path.
   * @returns @void
   */
  public write(key: string, data: any): void {
    if (!this.#configStore) {
      throw new Error("Config store is not initialized");
    }

    if (isFunction(data)) {
      throw new Error("Cannot write a function to the config store");
    }
    const keys = key.split(".");
    if (!keys.length) {
      return;
    }

    const firstKey: string = keys.shift()!;
    const notAllowedToWriteFiles = [
      "app",
      "auth",
      "cache",
      "database",
      "filesystems",
      "mail",
      "queue",
      "session",
      "view",
      "cors",
      "logging",
      "services",
      "broadcasting",
    ];
    if (!this.#configStore[firstKey]) {
      this.#configStore[firstKey] = {}; // Create if it doesn't exist
    }

    // Traverse the object and assign the value
    let current = this.#configStore[firstKey];
    while (keys.length > 1) {
      const nextKey = keys.shift()!;
      if (
        typeof current[nextKey] !== "object" ||
        current[nextKey] === null ||
        Array.isArray(current[nextKey])
      ) {
        current[nextKey] = {}; // Ensure intermediate path exists
      }
      current = current[nextKey];
    }

    const finalKey = keys.shift()!;
    current[finalKey] = data;
  }
}

export default Constants;
