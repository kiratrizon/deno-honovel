/// <reference path="./index.d.ts" />

import ExpressRequest from "./declaration/ExpressRequest.d.ts";
import ExpressResponse from "./declaration/ExpressResponse.d.ts";

export {};
declare global {
  /**
   * Instantiates a new ExpressResponse object.
   * Can be used to fluently build JSON or HTML responses for the application.
   *
   * Usage:
   *   return response('<h1>Hello World</h1>');
   *   return response().json({ success: true });
   *
   * @param html - Optional HTML content to initialize the response with.
   * @returns An instance of ExpressResponse.
   */
  function response(html?: string | null): ExpressResponse;

  interface HttpExpress {
    /**
     * The ExpressRequest object that encapsulates the HTTP request data.
     */
    request: InstanceType<typeof ExpressRequest>;
  }
}
