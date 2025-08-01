import { SessionDataTypes } from "../../../../@types/declaration/imain.d.ts";
import { NonFunction } from "../../../../@types/declaration/ISession.d.ts";

/**
 * The Session class is responsible for storing and managing session data
 * including CSRF token generation and rotation. Inspired by Laravel's session handling.
 */
export class Session<D extends SessionDataTypes> {
  // Internal session ID, if available
  #id: string | null = null;

  private values: Record<string, NonFunction<unknown>> & SessionDataTypes;
  constructor(values = {}) {
    this.values = values as SessionDataTypes;
  }

  /**
   * Store a value in the session.
   * @param key - The session key
   * @param value - The value to store
   */
  public put<T extends SessionDataTypes[keyof SessionDataTypes]>(key: keyof D, value: T) {
    if (isFunction(value)) {
      throw new Error(
        `Session values cannot be functions. Key: ${key as string}.`
      );
    }
    this.values[key as string] = value;
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
    return this.values[key as keyof SessionDataTypes] ?? defaultValue;
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
    this.values = values as SessionDataTypes;
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
    this.values = only(this.values, [
      "_token", // Keep CSRF token
      "_previousUrl", // Keep previous URL
      "_newUrl", // Keep new URL
      "_flash", // Keep flash data
    ]) as SessionDataTypes;
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

  /**
   * Flash a value to the session for the next request.
   */

  public flash(key: keyof D, value: NonFunction<unknown>) {
    if (!keyExist(this.values, "_flash")) {
      this.put("_flash", {
        old: {} as Record<string, unknown>,
        new: {} as Record<string, unknown>,
      });
    }

    this.values._flash.new[key as string] = value;
  }
}
