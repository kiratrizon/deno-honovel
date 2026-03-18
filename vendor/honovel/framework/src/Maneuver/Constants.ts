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
}

export default Constants;
