// ExpressRedirect.d.ts

/**
 * Represents a redirect response helper similar to Laravel's redirect().
 */
declare class ExpressRedirect {
  /**
   * The URL to redirect to.
   */
  url: string | null;

  /**
   * The HTTP status code to use for the redirect.
   */
  statusCode?: number;

  /**
   * Creates a new ExpressRedirect instance.
   * @param url - The URL to redirect to. Defaults to an empty string.
   */
  constructor(url?: string);

  /**
   * Sets the HTTP status code for the redirect.
   * @param code - The status code to set.
   * @returns The current ExpressRedirect instance.
   */
  setStatusCode(code: number): this;

  /**
   * Return to the referrer.
   * @param url - The URL to set.
   * @returns The current ExpressRedirect instance.
   */
  back(): this;

  /**
   * Redirect to a declared route names in class Route.
   * @param url - The URL to redirect to.
   * @returns The current ExpressRedirect instance.
   */
  route(url: string): this;
}

export default ExpressRedirect;
