/// <reference path="./index.d.ts" />

import HonoRequest from "./declaration/HonoRequest.d.ts";
import HonoResponse from "./declaration/HonoResponse.d.ts";

export {};
declare global {
  /**
   * Instantiates a new HonoResponse object.
   * Can be used to fluently build JSON or HTML responses for the application.
   *
   * Usage:
   *   return response('<h1>Hello World</h1>');
   *   return response().json({ success: true });
   *
   * @param html - Optional HTML content to initialize the response with.
   * @returns An instance of HonoResponse.
   */
  function response(html?: string | null): HonoResponse;

  /**
   * HttpHono interface with all the request data.
   * This interface is used to pass the request data to the controller methods.
   * It contains the HonoRequest object that encapsulates the HTTP request data.
   */
  interface HttpHono {
    /**
     * The HonoRequest object that encapsulates the HTTP request data.
     */
    request: InstanceType<typeof HonoRequest>;
  }
}
