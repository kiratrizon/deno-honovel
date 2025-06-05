/**
 * A contract/interface for a session handler that stores and retrieves non-function values.
 */
// deno-lint-ignore-file no-explicit-any
type NonFunction<T> = T extends (...args: any[]) => any
  ? never // exclude functions
  : T extends object
  ? { [K in keyof T]: NonFunction<T[K]> }
  : T;

export declare class SessionContract {
  /**
   * Store a key-value pair in the session.
   *
   * @param key - The key under which the value will be stored.
   * @param value - The value to store (must not be a function).
   */
  put(key: string, value: NonFunction<unknown>): void;

  /**
   * Retrieve a value from the session by key.
   *
   * @param key - The key to look up.
   * @returns The stored value or null if the key does not exist.
   */
  get(key: string): NonFunction<unknown> | null;

  /**
   * Determine if a key exists in the session.
   *
   * @param key - The key to check.
   * @returns True if the key exists, false otherwise.
   */
  has(key: string): boolean;

  /**
   * Remove a key and its value from the session.
   *
   * @param key - The key to remove.
   */
  forget(key: string): void;
}
