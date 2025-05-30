/**
 * Represents a redirect response, similar to Laravel's RedirectResponse.
 * Allows fluent method chaining to define redirection behavior.
 */

export type FlashArg =
  | [key: string, value: unknown]
  | [data: Record<string, unknown>];

declare class IRedirectResponse {
  constructor(route?: string | null);
  /**
   * Redirect to the given path.
   * @param path - The target URL path.
   */
  public to(path: string): this;

  /**
   * Redirect to a named route.
   * @param name - The route name.
   * @param params - Optional route parameters.
   */
  public route(name: string, params?: Record<string, unknown>): this;

  /**
   * Redirect back to the previous location.
   */
  public back(): this;

  /**
   * Attach flash data to the redirect session.
   * @param key - The flash key.
   * @param value - The flash value.
   */
  public with(...args: FlashArg): this;

  /**
   * Attach error messages to the session.
   * @param errors - Errors as a string or key-value map.
   * @param key - Optional error bag key.
   */
  public withErrors(...args: FlashArg): this;

  /**
   * Get the final redirect target URL.
   * For debugging purposes, returns the URL to which the response will redirect.
   */
  public getTargetUrl(): string;

  /**
   * Simulate sending the response.
   */
  // public send(): void;
}

export default IRedirectResponse;

export declare class IERedirectResponse extends IRedirectResponse {
  public get type(): keyof IRedirectData;
}

export interface IRedirectData {
  redirect: string;
  back: boolean;
  route: string;
  to: string;
}
