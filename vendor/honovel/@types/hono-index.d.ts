/// <reference path="./index.d.ts" />

import HonoClosure from "../framework/src/hono/Http/HonoClosure.ts";
import { HttpStatusCodeValue } from "../framework/src/Maneuver/HonovelErrors.ts";
import IHonoRequest from "../@types/declaration/IHonoRequest.d.ts";
import IHonoResponse from "../@types/declaration/IHonoResponse.d.ts";
import IHonoView from "../@types/declaration/IHonoView.d.ts";
import { IConfigure } from "../@types/declaration/MyImports.d.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";

export { };
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
  function response(html?: string | null): IHonoResponse;

  /**
   * Instantiates a new HonoView object.
   * Can be used to render views with data and merge additional data.
   *
   * Usage:
   *   return view('index', { title: 'Home' });
   *   return view('index').merge({ user: 'John Doe' });
   *
   * @param viewName - The name of the view file to render.
   * @param data - Optional data to pass to the view.
   * @param mergeData - Optional additional data to merge with the view.
   * @returns An instance of HonoView.
   */
  function view(
    viewName: string,
    data?: Record<string, unknown>,
    mergeData?: Record<string, unknown>
  ): IHonoView;

  function route(name: string, params?: Record<string, unknown>): string;

  /**
   * HttpHono interface with all the request data.
   * This interface is used to pass the request data to the controller methods.
   * It contains the HonoRequest object that encapsulates the HTTP request data.
   */
  interface HttpHono {
    /**
     * The HonoRequest object that encapsulates the HTTP request data.
     */
    get request(): IHonoRequest;
    /**
     * Access the constant configuration data.
     * Read and write to the configuration store.
     */
    get Configure(): typeof IConfigure;
  }

  type HttpMiddleware = (
    httpHono: HttpHono,
    next: HonoClosure["next"]
  ) => Promise<unknown>;

  type HttpDispatch = (
    httpHono: HttpHono,
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ) => Promise<number | null | boolean | string | object | []>;

  // const storedRoutes: Record<string, unknown>;

  /**
   * Dumps the provided arguments and throws an error to stop execution.
   * This is useful for debugging purposes.
   *
   * Usage:
   *   dd('Debugging info', { key: 'value' });
   *
   * @param args - The arguments to dump.
   */
  function dd(...args: unknown[]): never;

  /**
   * Aborts the current request with a specified HTTP status code and optional message.
   * This is useful for error handling and stopping further processing of the request.
   *
   * Usage:
   *   abort(404, 'Not Found');
   *
   * @param statusCode - The HTTP status code to return (default is 500).
   * @param message - Optional message to include in the response.
   * @returns Never returns;
   */
  function abort(statusCode: ContentfulStatusCode, message?: string): never;
}
