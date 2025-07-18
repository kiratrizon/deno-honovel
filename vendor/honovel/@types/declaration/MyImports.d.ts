import { ConfigItems } from "../../../../config/@types/index.d.ts";

export declare class IConfigure {
  /**
   * Reads configuration values from the config store based on a dot-notation string.
   * @param key - Dot-separated string indicating the config path.
   * @returns The requested configuration value or null if not found.
   */
  public static read<T extends keyof ConfigItems>(key: T): ConfigItems[T];
  public static read(key: string): unknown;

  /**
   * Writes a value to the specified config path in the in-memory store.
   * @param key - Dot-separated string indicating where to write.
   * @param data - The value to store at the given path.
   */
  public static write(key: string, data: unknown): void;
}

declare module "hono" {
  interface ContextRenderer {
    (content: string, head: Record<string, string>):
      | Response
      | Promise<Response>;
  }
}
