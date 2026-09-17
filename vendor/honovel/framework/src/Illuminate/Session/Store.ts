import { SessionDataTypes } from "../../../../@types/declaration/imain.d.ts";
import { NonFunction } from "../../../../@types/declaration/ISession.d.ts";
import { SessionHandler } from "./SessionHandler.ts";

export interface SessionStore {
  start(): Promise<void>;
  save(): Promise<void>;

  getId(): string;
  setId(id: string | null): void;

  getName(): string;
  setName(name: string): void;

  get<T = unknown>(key: string, defaultValue?: T): T;
  put(key: string, value: unknown): void;
  has(key: string): boolean;
  all(): Record<string, unknown>;
  flash(key: string, value: unknown): void;

  forget(key: string): void;
  flush(): void;

  regenerate(destroy?: boolean): Promise<boolean>;
  invalidate(): Promise<boolean>;
  regenerateToken(): void;
  clear(): void;

  ageFlashData(): void;
  previousUrl(): string | null;
  setPreviousUrl(url: string): void;

  getHandler(): SessionHandler;

  token(): string;
}

export default class Store<D extends SessionDataTypes = SessionDataTypes>
  implements SessionStore
{
  // Internal session ID. Always present: one is generated if none is supplied.
  #id: string;

  // The cookie name this session is carried under.
  #name: string;

  #handler: SessionHandler;

  #started = false;

  private values: Record<string, NonFunction<unknown>> & SessionDataTypes;

  /**
   * @param name    Cookie name carrying the session id.
   * @param handler Persistence for this session.
   * @param id      Existing session id, usually read from the request cookie.
   *                A fresh one is generated when omitted or malformed.
   */
  constructor(name: string, handler: SessionHandler, id: string | null = null) {
    this.#name = name;
    this.#handler = handler;
    this.#id = this.isValidId(id) ? (id as string) : this.generateSessionId();
    this.values = {} as SessionDataTypes;
    this.ensureDefaults();
  }

  /**
   * Load the session from the handler.
   *
   * The id must already be set - the caller reads it from the request cookie
   * (or lets the constructor mint one) before starting.
   */
  public async start(): Promise<void> {
    if (this.#started) return;

    this.values = await this.readFromHandler();
    this.ensureDefaults();

    if (!this.has("_token")) {
      this.regenerateToken();
    }

    this.#started = true;
  }

  /**
   * Write the session back through the handler.
   * A session that was never started has nothing to persist.
   */
  public async save(): Promise<void> {
    if (!this.#started) return;

    this.ageFlashData();

    await this.#handler.write(
      this.#id,
      await this.prepareForStorage(jsonEncode(this.values)),
    );

    // Laravel clears `started` here too. It makes a second save a no-op, so a
    // belt-and-braces save elsewhere cannot age the flash bag twice.
    this.#started = false;
  }

  /**
   * Give the session a new id, keeping its data.
   * Pass `destroy` to also drop the old record from storage.
   */
  public async regenerate(destroy: boolean = false): Promise<boolean> {
    if (destroy) {
      await this.#handler.destroy(this.#id);
    }

    this.setId(this.generateSessionId());
    this.regenerateToken();

    return true;
  }

  /**
   * Empty the session and give it a new id, destroying the old record.
   */
  public async invalidate(): Promise<boolean> {
    this.flush();
    return await this.regenerate(true);
  }

  /**
   * Store a value in the session.
   * @param key - The session key
   * @param value - The value to store
   */
  public put<T>(key: string, value: T) {
    if (isFunction(value)) {
      throw new Error(`Session values cannot be functions. Key: ${key}.`);
    }

    const parts = key.split(".");
    let target: Record<string, any> = this.values;

    while (parts.length > 1) {
      const part = parts.shift()!;
      if (typeof target[part] !== "object" || target[part] === null) {
        target[part] = {};
      }
      target = target[part];
    }

    target[parts[0]] = value;

    return value;
  }

  /**
   * Retrieve a value from the session.
   * @param key - The session key
   * @param defaultValue - A fallback if the key doesn't exist
   */
  public get<T = D[keyof D] | NonFunction<unknown>>(
    key: string,
    defaultValue: T = null as T,
  ): T {
    const parts = key.split(".");
    let value: any = this.values;

    for (const part of parts) {
      if (typeof value !== "object" || value === null || !(part in value)) {
        return defaultValue;
      }
      value = value[part];
    }

    return (value ?? defaultValue) as T;
  }

  /**
   * Check if a session key exists.
   * @param key - The key to check
   */
  public has(key: string): boolean {
    const parts = key.split(".");
    let value: any = this.values;

    for (const part of parts) {
      if (typeof value !== "object" || value === null || !(part in value)) {
        return false;
      }
      value = value[part];
    }

    return true;
  }

  /**
   * Remove a session key and its value.
   * @param key - The key to remove
   */
  public forget(key: string) {
    const parts = key.split(".");
    let target: any = this.values;

    while (parts.length > 1) {
      const part = parts.shift()!;
      if (typeof target[part] !== "object" || target[part] === null) {
        return; // Key path doesn't exist
      }
      target = target[part];
    }

    delete target[parts[0]];
  }

  /**
   * Retrieve the current session ID.
   */
  public getId(): string {
    return this.#id;
  }

  /**
   * Assign the session ID, minting a fresh one if the given value is unusable.
   */
  public setId(id: string | null): void {
    this.#id = this.isValidId(id) ? (id as string) : this.generateSessionId();
  }

  /**
   * The cookie name carrying this session.
   */
  public getName(): string {
    return this.#name;
  }

  public setName(name: string): void {
    this.#name = name;
  }

  /**
   * The handler backing this session.
   */
  public getHandler(): SessionHandler {
    return this.#handler;
  }

  /**
   * Whether start() has run.
   */
  public isStarted(): boolean {
    return this.#started;
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
    // Reset everything except internal ID
    this.values = {} as SessionDataTypes;

    this.ensureDefaults();

    // Regenerate CSRF token
    this.regenerateToken();
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
    this.put("_token", token);
    return token;
  }

  /**
   * Flash a value to the session for the next request.
   */
  public flash(key: keyof D, value: NonFunction<unknown>) {
    if (!keyExist(this.values, "_flash")) {
      this.put("_flash", {
        old: [],
        new: [],
      });
    }
    if (!this.values._flash.new.includes(key as string)) {
      this.values._flash.new.push(key as string);
    }

    this.put(key as string, value);
  }

  /**
   * Age the flash data.
   *
   * Keys flashed on the previous request have now been readable for one full
   * request, so they go; this request's flashes take their place. Running at
   * save() time is what makes a flashed value live for exactly one subsequent
   * request without any middleware bookkeeping.
   */
  public ageFlashData(): void {
    const flash = this.get("_flash") as
      | { old?: string[]; new?: string[] }
      | null;

    const previous = isArray(flash?.old) ? (flash?.old as string[]) : [];
    const current = isArray(flash?.new) ? (flash?.new as string[]) : [];

    for (const key of previous) {
      // A key re-flashed this request must survive another round.
      if (!current.includes(key)) {
        this.forget(key);
      }
    }

    this.put("_flash", { old: current, new: [] });
  }

  /**
   * The URL the user was last on, used by redirect().back().
   */
  public previousUrl(): string | null {
    return this.get("_previous.url") as string | null;
  }

  public setPreviousUrl(url: string): void {
    this.put("_previous.url", url);
  }

  /**
   * Remove all session data, keeping the current id.
   */
  public clear(): void {
    this.flush();
  }

  /**
   * Hook for subclasses that transform the payload on its way to storage -
   * an encrypting Store overrides this pair and leaves the handler untouched.
   */
  protected prepareForStorage(data: string): string | Promise<string> {
    return data;
  }

  protected prepareForUnserialize(data: string): string | Promise<string> {
    return data;
  }

  private async readFromHandler(): Promise<SessionDataTypes> {
    const raw = await this.#handler.read(this.#id);
    if (empty(raw)) {
      return {} as SessionDataTypes;
    }

    // jsonDecode yields null on malformed input rather than throwing, so a
    // corrupt record degrades to an empty session instead of a 500.
    const decoded = jsonDecode(await this.prepareForUnserialize(raw));
    return (isObject(decoded) ? decoded : {}) as SessionDataTypes;
  }

  /**
   * Make sure the flash bag exists before anything reads it.
   */
  private ensureDefaults(): void {
    if (!keyExist(this.values, "_flash")) {
      this.values._flash = {
        old: [],
        new: [],
      };
    }
  }

  private isValidId(id: string | null): boolean {
    return isString(id) && !empty(id);
  }

  /**
   * Session ids keep the shape used elsewhere in the framework:
   * a sortable timestamp followed by 32 hex characters.
   */
  private generateSessionId(): string {
    const array = crypto.getRandomValues(new Uint8Array(16));
    const randomPart = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return `${date("YmdHis")}${randomPart}`;
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
