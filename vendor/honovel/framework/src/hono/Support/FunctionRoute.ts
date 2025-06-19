import type { Context, MiddlewareHandler } from "hono";
import path from "node:path";
import HonoView from "../Http/HonoView.ts";
import { HonoNext } from "../../@hono-types/declaration/IRoute.d.ts";
import ChildKernel from "./ChildKernel.ts";
import HonoClosure from "../Http/HonoClosure.ts";
import { IMyConfig } from "./MethodRoute.ts";
import HonoDispatch from "../Http/HonoDispatch.ts";
import { buildRequest, myError } from "../Http/builder.ts";
import HonoRequest from "../Http/HonoRequest.ts";
import MyHono from "../Http/HttpHono.ts";
import Constants from "Constants";
import IHonoRequest from "../../@hono-types/declaration/IHonoRequest.d.ts";
import { IConfigure } from "../../@hono-types/declaration/MyImports.d.ts";
import HonoCookie from "../Http/HonoCookie.ts";
import { DDError } from "../../Maneuver/HonovelErrors.ts";
import util from "node:util";

export const regexObj = {
  number: /^\d+$/,
  alpha: /^[a-zA-Z]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  slug: /^[a-z0-9-]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
};
export function regexToHono(
  where: Record<string, RegExp[]>,
  params: string[] = []
): MiddlewareHandler {
  return async (c: Context, next) => {
    const { request } = c.get("httpHono") as HttpHono;
    for (const key of Object.keys(where)) {
      if (!params.includes(key)) continue;
      const regexValues = where[key] as RegExp[];
      const paramValue = request.route(key);
      const isPassed = regexValues.some((regex) =>
        regex.test(String(paramValue))
      );

      if (!isPassed) {
        return await myError(c);
      }
    }

    await next();
  };
}

export class URLArranger {
  public static urlCombiner(input: string[] | string, strict = true) {
    if (isString(input)) {
      input = [input];
    }
    const groups = input;
    let convertion = path.posix.join(...groups);
    if (convertion === ".") {
      convertion = "";
    }
    return this.processString(convertion, strict);
  }

  private static processString(input: string, strict = true) {
    const requiredParams: string[] = [];
    const optionalParams: string[] = [];
    const sequenceParams: string[] = [];
    if (input === "" || input === "/") {
      return { string: input, requiredParams, optionalParams, sequenceParams };
    }
    const regex = regexObj;

    // Step 1: Replace multiple slashes with a single slash
    input = input.replace(/\/+/g, "/");

    if (input.startsWith("/")) {
      input = input.slice(1); // Remove leading slash
    }
    if (input.endsWith("/")) {
      input = input.slice(0, -1); // Remove trailing slash
    }
    // Step 2: Split the string by slash
    const parts = input.split("/");
    const result = parts.map((part) => {
      const constantPart = part;
      if (part.startsWith("{") && part.endsWith("}")) {
        // Handle part wrapped in {}
        let isOptional = false;
        part = part.slice(1, -1); // Remove curly braces

        // Check if it's optional
        if (part.endsWith("?")) {
          part = part.slice(0, -1); // Remove the '?' character
          isOptional = true;
        }

        // If it's an alpha string, handle it
        if (regex.alphanumeric.test(part)) {
          if (isOptional) {
            optionalParams.push(part);
            sequenceParams.push(part);
            return `:${part}?`; // Optional, wrapped with ":"
          } else {
            requiredParams.push(part);
            sequenceParams.push(part);
            return `:${part}`; // Non-optional, just with ":"
          }
        }

        if (strict) {
          throw new Error(
            `${JSON.stringify(constantPart)} is not a valid parameter name`
          );
        } else {
          return `${constantPart}`;
        }
      } else {
        if (regex.number.test(part)) {
          return `${part}`;
        }
        if (regex.alpha.test(part)) {
          return `${part}`;
        }
        if (regex.alphanumeric.test(part)) {
          return `${part}`;
        }
        if (regex.slug.test(part)) {
          return `${part}`;
        }
        if (regex.uuid.test(part)) {
          return `${part}`;
        }

        if (part.startsWith("*") && part.endsWith("*")) {
          const type = part.slice(1, -1); // remove * *

          if (regex.number.test(type)) {
            return `${part}`;
          }
        }
        if (strict) {
          throw new Error(`${constantPart} is not a valid route`);
        } else {
          return `${constantPart}`;
        }
      }
    });
    let modifiedString = `/${path.posix.join(...result)}`;
    if (modifiedString.endsWith("/") && modifiedString.length > 1) {
      modifiedString = modifiedString.slice(0, -1).replace(/\/\{/g, "{/"); // Remove trailing slash
    } else {
      modifiedString = modifiedString.replace(/\/\{/g, "{/");
    }
    return {
      string: modifiedString,
      requiredParams,
      optionalParams,
      sequenceParams,
    };
  }

  public static generateOptionalParamRoutes(
    route: string,
    type: "group" | "dispatch" = "dispatch",
    where: Record<string, RegExp[]> = {}
  ): string[] {
    const segments = route.split("/");
    const required: string[] = [];
    const optional: string[] = [];

    let mainRoute = route.replace(/\?/g, "");
    for (const segment of segments) {
      if (segment.startsWith(":") && segment.endsWith("?")) {
        optional.push(segment.slice(0, -1)); // remove ?
      } else if (segment.startsWith(":")) {
        required.push(segment);
      } else {
        required.push(segment);
      }
    }

    const getEnd = [];
    if (route.endsWith("?") && type === "dispatch") {
      mainRoute += "?"; // Ensure the main route ends with ?
      getEnd.push(optional.pop());
    }

    const results: string[] = [];
    for (let i = optional.length; i > 0; i--) {
      let reviseRoute = mainRoute;
      for (let j = 0; j < i; j++) {
        const text = optional[optional.length - 1 - j];
        reviseRoute = reviseRoute.replace(`/${text}`, ``);
      }
      results.push(reviseRoute);
    }

    results.push(mainRoute); // Add the original route without optional params
    const final = results.map((route) => {
      if (empty(route)) {
        return "/";
      }
      return route;
    });
    const finalMapping = final.flatMap((r) => {
      return type == "dispatch" && !r.endsWith("/") ? [r, `${r}/`] : [r];
    });

    // console.log(finalMapping, where);
    const constrainedMapping = finalMapping.map((route) => {
      return applyConstraintsWithOptional(route, where);
    });

    // console.log(constrainedMapping);

    return constrainedMapping;
  }
}

function applyConstraintsWithOptional(
  route: string,
  where: Record<string, RegExp[]>
): string {
  return route.replace(
    /:([a-zA-Z0-9_]+)(\?)?/g,
    (full, param, optionalMark) => {
      const constraints = where[param];
      if (constraints) {
        const pattern = constraints
          .map((r) => r.source.replace(/^(\^)?/, "").replace(/(\$)?$/, ""))
          .join("|");
        return `:${param}{${pattern}}${optionalMark ?? ""}`;
      }
      return full;
    }
  );
}

export function toMiddleware(
  args: (string | ((obj: HttpHono, next: HonoNext) => Promise<unknown>))[]
): MiddlewareHandler[] {
  const instanceKernel = new ChildKernel();
  const MiddlewareGroups = instanceKernel.MiddlewareGroups;
  const RouteMiddleware = instanceKernel.RouteMiddleware;
  const newArgs = args.flatMap((arg) => {
    const middlewareCallback: ((
      obj: HttpHono,
      next: HonoNext
    ) => Promise<unknown>)[] = [];
    if (isString(arg)) {
      if (keyExist(MiddlewareGroups, arg)) {
        const middlewareGroup = MiddlewareGroups[arg];
        middlewareGroup.forEach((middleware) => {
          if (isString(middleware)) {
            if (keyExist(RouteMiddleware, middleware)) {
              const middlewareClass = RouteMiddleware[middleware];
              const middlewareInstance =
                new (middlewareClass as new () => InstanceType<
                  typeof middlewareClass
                >)();
              if (methodExist(middlewareInstance, "handle")) {
                middlewareCallback.push(
                  middlewareInstance.handle.bind(
                    middlewareInstance
                  ) as HttpMiddleware
                );
              }
            }
          } else {
            const middlewareInstance = new middleware();
            if (methodExist(middlewareInstance, "handle")) {
              middlewareCallback.push(
                middlewareInstance.handle.bind(
                  middlewareInstance
                ) as HttpMiddleware
              );
            }
          }
        });
      } else if (keyExist(RouteMiddleware, arg)) {
        const middlewareClass = RouteMiddleware[arg];
        const middlewareInstance = new (middlewareClass as new (
          // deno-lint-ignore no-explicit-any
          ...args: any[]
        ) => // deno-lint-ignore no-explicit-any
        any)();
        if (methodExist(middlewareInstance, "handle")) {
          middlewareCallback.push(
            middlewareInstance.handle.bind(middlewareInstance) as HttpMiddleware
          );
        }
      }
    } else if (isFunction(arg)) {
      middlewareCallback.push(arg as HttpMiddleware);
    }
    return middlewareCallback;
  });

  return newArgs.map((args): MiddlewareHandler => {
    return async (c: Context, next) => {
      // c.setRenderer((content, head) => {
      //   return c.html(
      //     `<html>
      //       <head>
      //         <title>${head.title}</title>
      //       </head>
      //       <body>
      //         <header>${head.title}</header>
      //         <p>${content}</p>
      //       </body>
      //     </html>`
      //   );
      // });
      const httpHono = c.get("httpHono") as HttpHono;
      const request = httpHono.request;
      const honoClosure = new HonoClosure();
      try {
        const middlewareResp =
          (await args(httpHono, honoClosure.next.bind(honoClosure))) || null;
        if (isNull(middlewareResp)) {
          return c.json(null);
        }
        const dispatch = new HonoDispatch(middlewareResp, "middleware");
        if (!dispatch.isNext) {
          return (await dispatch.build(request, c)) as Response;
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          // populate e with additional information
          const populatedError: Record<string, unknown> = {};
          populatedError["error_type"] = e.name.trim();
          populatedError["message"] = e.message.trim();
          populatedError["stack"] = e.stack
            ? e.stack.split("\n").map((line) => line.trim())
            : [];
          populatedError["cause"] = e.cause;
          log(
            populatedError,
            "error",
            `Request URI ${request
              .method()
              .toUpperCase()} ${request.path()}\nRequest ID ${request.server(
              "HTTP_X_REQUEST_ID"
            )}`
          );
          let errorHtml: string;
          if (!request.expectsJson()) {
            errorHtml = renderErrorHtml(e);
          } else {
            errorHtml = "Internal server error";
          }
          return c.html(errorHtml, 500);
        } else if (e instanceof DDError) {
          const data = forDD(e.data);
          if (request.expectsJson()) {
            if (isNull(data.json)) {
              data.json = null;
            }
            if (
              isArray(data.json) ||
              isObject(data.json) ||
              isString(data.json) ||
              isFloat(data.json) ||
              isInteger(data.json) ||
              isBoolean(data.json) ||
              isNull(data.json)
            ) {
              return c.json(data.json, 200);
            }
          } else {
            return c.html(data.html, 200);
          }
        }
        return c.json({ message: "Internal server error" }, 500);
      }
      await next();
    };
  });
}

export function toDispatch(
  myconf: IMyConfig["callback"],
  sequenceParams: string[]
): MiddlewareHandler {
  return async (c: Context) => {
    const httpHono = c.get("httpHono") as HttpHono;
    const params = httpHono.request.route() as Record<string, string>;
    const newParams: Record<string, unknown> = {};
    sequenceParams.forEach((param) => {
      if (keyExist(params, param)) {
        newParams[param] = params[param] || null;
      } else {
        newParams[param] = null;
      }
    });
    if (!isFunction(myconf)) {
      if (httpHono.request.expectsJson()) {
        return c.html("Cannot find route", 500);
      } else {
        return c.json(
          {
            message: "Cannot find route",
          },
          500
        );
      }
    }
    try {
      const middlewareResp = await myconf(
        httpHono,
        ...Object.values(newParams)
      );
      const dispatch = new HonoDispatch(middlewareResp, "dispatch");
      const build = (await dispatch.build(httpHono.request, c)) as Response;
      return build;
    } catch (e: unknown) {
      if (e instanceof Error) {
        // populate e with additional information
        const populatedError: Record<string, unknown> = {};
        populatedError["error_type"] = e.name.trim();
        populatedError["message"] = e.message.trim();
        populatedError["stack"] = e.stack
          ? e.stack.split("\n").map((line) => line.trim())
          : [];
        populatedError["cause"] = e.cause;
        log(
          populatedError,
          "error",
          `Request URI ${httpHono.request
            .method()
            .toUpperCase()} ${httpHono.request.path()}\nRequest ID ${httpHono.request.server(
            "HTTP_X_REQUEST_ID"
          )}`
        );
        let errorHtml: string;
        if (!httpHono.request.expectsJson()) {
          errorHtml = renderErrorHtml(e);
        } else {
          errorHtml = "Internal server error";
        }
        return c.html(errorHtml, 500);
      } else if (e instanceof DDError) {
        const data = forDD(e.data);
        if (httpHono.request.expectsJson()) {
          if (isNull(data.json)) {
            data.json = null;
          }
          if (
            isArray(data.json) ||
            isObject(data.json) ||
            isString(data.json) ||
            isFloat(data.json) ||
            isInteger(data.json) ||
            isBoolean(data.json) ||
            isNull(data.json)
          ) {
            return c.json(data.json, 200);
          }
        } else {
          return c.html(data.html, 200);
        }
      }
    }
    return c.json({ message: "Internal server error" }, 500);
  };
}

export function renderErrorHtml(e: Error): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>🔥 Server Error</title>
    <script src="/system-assets/js/tailwind.js"></script>
    <style>
      html { font-family: ui-sans-serif, system-ui, sans-serif; }
    </style>
  </head>
  <body class="bg-gradient-to-br from-orange-100 to-yellow-50 min-h-screen flex items-center justify-center p-6">
    <div class="bg-white border-4 border-red-600 rounded-xl shadow-xl max-w-3xl w-full overflow-hidden">
      <div class="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 text-white px-6 py-5">
        <h1 class="text-3xl font-extrabold flex items-center gap-2">
          <span class="text-4xl">🔥</span> Server Error
        </h1>
        <p class="text-sm opacity-90 mt-1">The server encountered an unexpected condition.</p>
      </div>
      <div class="px-6 py-6">
        <h2 class="text-xl font-semibold text-red-800 mb-2">💥 Message</h2>
        <p class="bg-red-100 text-red-700 rounded-md px-4 py-3 border border-red-300 mb-6 font-mono text-sm">
          ${e.message}
        </p>

        ${
          e.stack
            ? `
            <h2 class="text-xl font-semibold text-gray-800 mb-2">🧱 Stack Trace</h2>
            <pre class="text-xs leading-relaxed font-mono bg-gray-900 text-green-400 p-4 rounded-lg border border-gray-700 overflow-x-auto whitespace-pre-wrap hover:scale-[1.01] transition-transform duration-200 ease-out shadow-inner">
${e.stack.replace(/</g, "&lt;")}
            </pre>`
            : ""
        }
      </div>
    </div>
  </body>
  </html>
  `;
}
export const buildRequestInit = (): MiddlewareHandler => {
  const configure = new Constants(myConfigData) as IConfigure;
  return async (c, next) => {
    const rawRequest = await buildRequest(c);
    const request: IHonoRequest = new HonoRequest(
      rawRequest,
      c.get("sessionInstance")
    );
    const constructorObj = {
      request,
      config: configure,
    };
    c.set("httpHono", new MyHono(constructorObj));
    await next();
  };
};

function forDD(data: unknown) {
  let newData: unknown;
  try {
    newData = jsonDecode(jsonEncode(data));
  } catch (_e) {
    newData = data;
  }
  const html = `
					<style>
						body { background: #f8fafc; color: #1a202c; font-family: sans-serif; padding: 2rem; }
						pre { background: #1a202c; color: #f7fafc; padding: 1.5rem; border-radius: 0.5rem; font-size: 14px; overflow-x: auto; }
						code { white-space: pre-wrap; word-break: break-word; }
					</style>
					<pre><code>${util.inspect(newData, { colors: false, depth: null })}</code></pre>
				`;

  const json = newData;

  return {
    html,
    json,
  };
}
