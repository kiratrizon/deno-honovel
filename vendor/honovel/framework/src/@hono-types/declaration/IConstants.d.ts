// configure.d.ts

export interface ConfigStore {
  [key: string]: unknown;
}

export interface IConstants {
  /**
   * Reads a value from the config store using dot notation.
   * @param key - The dot-notation string key.
   * @returns The found value or null if not found.
   */
  read(key: string): unknown;

  /**
   * Writes a value to the config store using dot notation.
   * @param key - The dot-notation string key.
   * @param data - The value to set at the given path.
   */
  write(key: string, data: unknown): void;
}
