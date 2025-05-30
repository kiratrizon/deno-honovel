export interface IConfigure {
  /**
   * Reads configuration values from the config store based on a dot-notation string.
   * @param key - Dot-separated string indicating the config path.
   * @returns The requested configuration value or null if not found.
   */
  read(key: string): unknown;

  /**
   * Writes a value to the specified config path in the in-memory store.
   * @param key - Dot-separated string indicating where to write.
   * @param data - The value to store at the given path.
   */
  write(key: string, data: unknown): void;
}

declare module "hono" {
  interface ContextRenderer {
    (content: string, head: Record<string, string>):
      | Response
      | Promise<Response>;
  }
}
