import { NonFunction } from "../../../../@types/declaration/ISession.d.ts";

/**
 * The Session class is responsible for storing and managing session data
 * including CSRF token generation and rotation. Inspired by Laravel's session handling.
 */
export class Session<D extends Record<string, NonFunction<unknown>>> {
  // Internal session ID, if available
  #id: string | null = null;

  private values: Record<keyof D, NonFunction<unknown>>;
  constructor(values = {}) {
    this.values = values as Record<keyof D, NonFunction<unknown>>;
  }

  /**
   * Store a value in the session.
   * @param key - The session key
   * @param value - The value to store
   */
  public put<T extends D[keyof D]>(key: keyof D, value: T) {
    if (isFunction(value)) {
      throw new Error(
        `Session values cannot be functions. Key: ${key as string}.`
      );
    }
    this.values[key] = value;
    return value;
  }

  /**
   * Retrieve a value from the session.
   * @param key - The session key
   * @param defaultValue - A fallback if the key doesn't exist
   */
  public get<V = D[keyof D] | NonFunction<unknown>>(
    key: keyof D,
    defaultValue: V = null as V
  ): NonFunction<unknown> | null {
    return this.values[key] ?? defaultValue;
  }

  /**
   * Check if a session key exists.
   * @param key - The key to check
   */
  public has(key: keyof D): boolean {
    return keyExist(this.values, key);
  }

  /**
   * Remove a session key and its value.
   * @param key - The key to remove
   */
  public forget(key: string) {
    delete this.values[key];
  }

  /**
   * Overwrite all stored session values.
   * @param values - A full key-value record to replace the session state
   */
  protected updateValues(
    values: Record<keyof D | string, NonFunction<unknown>>
  ) {
    this.values = values;
  }

  /**
   * Assign the current session ID.
   * Used internally after session has been started or persisted.
   */
  protected updateId(id: string) {
    this.#id = id;
  }

  /**
   * Retrieve the current session ID.
   */
  public getId() {
    return this.#id;
  }

  /**
   * Return all session values.
   */
  public all(): Record<string, NonFunction<unknown>> {
    return { ...this.values };
  }

  /**
   * Remove all session data.
   */
  public flush() {
    this.values = {} as Record<keyof D | string, NonFunction<unknown>>;
  }

  /**
   * Get the current CSRF token from session,
   * generating one if it doesn't exist.
   */
  public token(): string {
    const token = this.get("_token");
    if (isset(token)) {
      return token as string;
    }
    this.regenerateToken();
    return this.get("_token") as string;
  }

  /**
   * Forcefully regenerate and update the CSRF token in session.
   * Useful after form submission, login, etc.
   */
  public regenerateToken(): string {
    const token = this.generateToken();
    // @ts-ignore //
    this.put("_token", token);
    return token;
  }

  /**
   * Generate a cryptographically secure CSRF token (40-char hex string).
   * 20 bytes = 40 hex characters.
   */
  private generateToken(length: number = 40): string {
    const array = new Uint8Array(length / 2); // 20 bytes
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}
