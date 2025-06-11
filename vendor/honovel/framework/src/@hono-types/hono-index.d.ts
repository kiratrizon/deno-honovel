/// <reference path="./index.d.ts" />

import HonoClosure from "../hono/Http/HonoClosure.ts";
import IHonoRequest from "./declaration/IHonoRequest.d.ts";
import IHonoResponse from "./declaration/IHonoResponse.d.ts";
import IHonoView from "./declaration/IHonoView.d.ts";
import { IConfigure } from "./declaration/MyImports.d.ts";

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
    get Config(): IConfigure;
  }

  type HttpMiddleware = (
    httpHono: HttpHono,
    next: HonoClosure["next"]
  ) => Promise<unknown>;

  type HttpDispatch = (
    httpHono: HttpHono,
    ...args: unknown[]
  ) => Promise<unknown>;

  // const storedRoutes: Record<string, unknown>;
}
