// IHonoRedirect.d.ts

/**
 * Represents a redirect response helper similar to Laravel's redirect().
 */
interface IHonoRedirect {
  /**
   * The URL to redirect to.
   */
  url: string | null;

  /**
   * The HTTP status code to use for the redirect.
   */
  statusCode?: number;

  /**
   * Sets the HTTP status code for the redirect.
   * @param code - The status code to set.
   * @returns The current IHonoRedirect instance.
   */
  setStatusCode(code: number): this;

  /**
   * Return to the referrer.
   * @param url - The URL to set.
   * @returns The current IHonoRedirect instance.
   */
  back(): this;

  /**
   * Redirect to a declared route names in class Route.
   * @param url - The URL to redirect to.
   * @returns The current IHonoRedirect instance.
   */
  route(url: string): this;
}

export default IHonoRedirect;
