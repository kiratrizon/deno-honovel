/// <reference path="./index.d.ts" />

import HonoClosure from "HonoHttp/HonoClosure.ts";
import { HttpStatusCodeValue } from "../framework/src/Maneuver/HonovelErrors.ts";
import HonoRequest from "../framework/src/hono/Http/HonoRequest.d.ts";
import IHonoResponse from "../@types/declaration/IHonoResponse.d.ts";
import IHonoView from "../@types/declaration/IHonoView.d.ts";
import { IConfigure } from "../@types/declaration/MyImports.d.ts";
import { ContentfulStatusCode } from "http-status";
import { SessionModifier } from "HonoHttp/HonoSession.ts";
import { Context } from "hono";
import { HonoTypeImport } from "./declaration/imain.d.ts";

import HttpHono from "HttpHono";
import IRedirectResponse from "./declaration/IHonoRedirect.d.ts";
import HonoResponseV2, { HTMLResponse } from "HonoHttp/HonoResponse.ts";

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
  function response(): HonoResponseV2;
  function response(html: string, status?: number): HTMLResponse;

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
  interface IHttpHono {
    /**
     * The HonoRequest object that encapsulates the HTTP request data.
     */
    get request(): HonoRequest;
    /**
     * Access the constant configuration data.
     * Read and write to the configuration store.
     */
    get Configure(): typeof IConfigure;

    /**
     * Access the session data.
     * This is used to manage user sessions and store session variables.
     */
    get session(): SessionModifier;
  }

  type HttpMiddleware = (
    myHono: HttpHono,
    // @ts-ignore //
    next: HonoClosure["next"],
    ...args: string[]
  ) => Promise<unknown>;

  type HttpDispatch = (
    myHono: HttpHono,
    ...args: any[]
  ) => Promise<number | null | boolean | string | object | []>;

  type nullify = null | undefined;

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
  function abort(
    statusCode: ContentfulStatusCode,
    message?: string | Record<string, unknown>
  ): never;

  /**
   * Redirect to a specified route or URL.
   * This is used to redirect the user to a different page or route.
   * Usage:
   *  redirect().to('/new-path');
   * redirect().route('home');
   * redirect().back();
   * redirect().with('key', 'value');
   * redirect().withErrors({ error: 'Something went wrong' });
   * @returns An instance of HonoRedirect.
   */

  function redirect(path?: string): IRedirectResponse;

  interface MyContext extends Context<HonoTypeImport> {}
}
