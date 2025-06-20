// HonoHeader.d.ts

import { IncomingHttpHeaders } from "node:http";
/**
 * HonoHeader class to manage HTTP headers.
 * It provides an easy interface to retrieve all headers.
 */
interface IHonoHeader {
  /**
   * Retrieves all the headers.
   * @returns An object containing all headers.
   */
  all(): IncomingHttpHeaders;
  /**
   * Retrieves a specific header by its key.
   * @param key - The name of the header to retrieve.
   * @returns The value of the specified header or undefined if not found.
   */
  get(key: string): string | null;
  /**
   * Checks if a specific header exists.
   * @param key - The name of the header to check.
   * @returns True if the header exists, false otherwise.
   */
  has(key: string): boolean;
  /**
   * Retrieves the request's user agent.
   * @returns The user agent string or null if not found.
   */
  contentType(): string | null;
  /**
   * Retrieves the request's accept language.
   * @returns The accept language string or null if not found.
   */
  acceptLanguage(): string | null;
  /**
   * Retrieves the request's authorization header.
   * @returns The authorization string or null if not found.
   */
  authorization(): string | null;
}

export default IHonoHeader;
