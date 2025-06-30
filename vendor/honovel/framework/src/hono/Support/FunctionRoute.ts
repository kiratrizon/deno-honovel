import type { Context, MiddlewareHandler } from "hono";
import path from "node:path";
import ChildKernel from "./ChildKernel.ts";
import HonoClosure from "../Http/HonoClosure.ts";
import { IMyConfig } from "./MethodRoute.ts";
import HonoDispatch from "../Http/HonoDispatch.ts";
import { buildRequest, myError } from "../Http/builder.ts";
import HonoRequest from "../Http/HonoRequest.ts";
import MyHono from "../Http/HttpHono.ts";
import Constants from "Constants";
import IHonoRequest from "../../../../@types/declaration/IHonoRequest.d.ts";
import { IConfigure } from "../../../../@types/declaration/MyImports.d.ts";
import { AbortError, DDError } from "../../Maneuver/HonovelErrors.ts";
import util from "node:util";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { SessionVar } from "../Http/HonoSession.ts";

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

interface IMiddlewareCompiler {
  debugString: string;
  middleware: HttpMiddleware;
}

export function toMiddleware(
  args: (string | HttpMiddleware)[]
): MiddlewareHandler[] {
  const instanceKernel = new ChildKernel();
  const MiddlewareGroups = instanceKernel.MiddlewareGroups;
  const RouteMiddleware = instanceKernel.RouteMiddleware;
  const newArgs = args.flatMap((arg) => {
    const middlewareCallback: IMiddlewareCompiler[] = [];
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
                middlewareCallback.push({
                  debugString: `// class ${
                    middlewareClass.name
                  }@handle \n// Code Referrence \n\n${middlewareInstance.handle.toString()}`,
                  middleware: middlewareInstance.handle.bind(
                    middlewareInstance
                  ) as HttpMiddleware,
                });
              }
            }
          } else {
            const middlewareInstance = new middleware();
            if (methodExist(middlewareInstance, "handle")) {
              middlewareCallback.push({
                debugString: `// class ${
                  middleware.name
                }@handle \n// Code Referrence \n\n${middlewareInstance.handle.toString()}`,
                middleware: middlewareInstance.handle.bind(
                  middlewareInstance
                ) as HttpMiddleware,
              });
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
          middlewareCallback.push({
            debugString: `// class ${
              middlewareClass.name
            }@handle \n// Code Referrence \n\n${middlewareInstance.handle.toString()}`,
            middleware: middlewareInstance.handle.bind(
              middlewareInstance
            ) as HttpMiddleware,
          });
        }
      }
    } else if (isFunction(arg)) {
      middlewareCallback.push({
        debugString: `// Code Referrence \n\n${arg.toString()}`,
        middleware: arg as HttpMiddleware,
      });
    }
    return middlewareCallback;
  });

  return newArgs.map((args): MiddlewareHandler => {
    const newObj: MiddlewareOrDispatch = {
      debugString: args.debugString,
      args: args.middleware,
    };
    return generateMiddlewareOrDispatch("middleware", newObj);
  });
}

export function toDispatch(
  objArgs: MiddlewareOrDispatch,
  sequenceParams: string[]
): MiddlewareHandler {
  return generateMiddlewareOrDispatch("dispatch", objArgs, sequenceParams);
}

interface MiddlewareOrDispatch {
  debugString: string;
  args: HttpMiddleware | IMyConfig["callback"];
}
function generateMiddlewareOrDispatch(
  type: "middleware" | "dispatch",
  objArgs: MiddlewareOrDispatch,
  sequenceParams: string[] = []
): MiddlewareHandler {
  return async (c: Context, next) => {
    const httpHono = c.get("httpHono") as HttpHono;
    const request = httpHono.request;
    let middlewareResp;
    const { args, debugString } = objArgs;
    if (!isFunction(args)) {
      return myError(c);
    }
    try {
      if (type === "middleware") {
        const honoClosure = new HonoClosure();
        middlewareResp = await (args as HttpMiddleware)(
          httpHono,
          honoClosure.next.bind(honoClosure)
        );
      } else {
        const params = httpHono.request.route() as Record<string, string>;
        const newParams: Record<string, unknown> = {};
        sequenceParams.forEach((param) => {
          if (keyExist(params, param)) {
            newParams[param] = params[param] ?? null;
          } else {
            newParams[param] = null;
          }
        });
        middlewareResp = await args(httpHono, ...Object.values(newParams));
      }
      if (isNull(middlewareResp) && type === "dispatch") {
        return c.json(null);
      }
      const dispatch = new HonoDispatch(middlewareResp, type);
      if ((type === "middleware" && !dispatch.isNext) || type === "dispatch") {
        const result = (await dispatch.build(request, c)) as Response;
        if (!isUndefined(result) && result instanceof Response) {
          return result;
        }
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
        if (env("APP_DEBUG", true)) {
          if (!request.expectsJson()) {
            errorHtml =
              extractControllerTrace(populatedError.stack as string[]) ||
              renderErrorHtml(e);
            return c.html(errorHtml, 500);
          } else {
            return c.json(
              {
                message: populatedError.message,
                error_type: populatedError.error_type,
                stack: populatedError.stack,
                cause: populatedError.cause,
              },
              500
            );
          }
        } else {
          return c.html("Internal server error", 500);
        }
      } else if (e instanceof DDError) {
        const data = forDD(e.data);
        if (request.expectsJson()) {
          if (!isset(data.json)) {
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
      } else if (e instanceof AbortError) {
        if (httpHono.request.expectsJson()) {
          return e.toJson();
        } else {
          return myError(c, e.code as ContentfulStatusCode, e.message);
        }
      }
      return c.json({ message: "Internal server error" }, 500);
    }
    if (!isUndefined(middlewareResp)) {
      if (type === "middleware") {
        return await next();
      }
    }
    if (type === "dispatch") {
      // @ts-ignore //
      type = "route";
    }
    const debuggingPurpose = renderDebugErrorPage(
      `${ucFirst(type)} Error`,
      debugString,
      `Returned undefined value from the ${type} function.`
    );
    if (!isset(env("DENO_DEPLOYMENT_ID"))) {
      return c.html(debuggingPurpose, 500);
    }
    log(
      debuggingPurpose,
      "error",
      `Request URI ${request
        .method()
        .toUpperCase()} ${request.path()}\nRequest ID ${request.server(
        "HTTP_X_REQUEST_ID"
      )}`
    );
    return c.json(
      {
        message: "Internal server error",
      },
      500
    );
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
  const configure = new Constants(myConfigData) as unknown as typeof IConfigure;
  return async (c, next) => {
    const rawRequest = await buildRequest(c);
    const request: IHonoRequest = new HonoRequest(
      rawRequest,
      c.get("sessionInstance")
    );
    const constructorObj = {
      request,
      config: configure,
      session: new SessionVar(c),
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

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderDebugErrorPage(
  title: string,
  debugString: string,
  message: string = "An unexpected error occurred."
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="/system-assets/js/tailwind.js"></script>
</head>
<body class="antialiased bg-gray-100 text-gray-900">
  <div class="min-h-screen flex items-center justify-center px-4 py-12">
    <div class="max-w-3xl w-full bg-white shadow-lg rounded-2xl p-8 border border-red-200">
      <h1 class="text-3xl font-bold text-red-600 mb-4">${title}</h1>

      <p class="text-gray-700 mb-6 text-base leading-relaxed">
        ${message}
      </p>

      <div class="bg-gray-900 text-green-300 text-sm font-mono p-4 rounded-lg overflow-auto max-h-[400px] border border-gray-700">
        <pre class="whitespace-pre-wrap"><code>${formatDebugString(
          escapeHtml(debugString)
        )}</code></pre>
      </div>

      <p class="text-xs text-gray-400 mt-6">
       ${date("Y-m-d H:i:s")}
      </p>
    </div>
  </div>
</body>
</html>
`;
}

export function formatDebugString(code: string): string {
  let indent = 0;
  return code
    .split("\n")
    .map((line) => {
      line = line.trim();
      if (line.endsWith("}")) indent--;
      const padded = "  ".repeat(Math.max(indent, 0)) + line;
      if (line.endsWith("{")) indent++;
      return padded;
    })
    .join("\n");
}

// for tracing
function extractControllerTrace(stack: string[]): string | false {
  const pattern = /file:\/\/(.+\/app\/Http\/Controllers\/[^:]+):(\d+):(\d+)/;

  const stackLine: Record<string, unknown> = {};
  for (const line of stack) {
    const match = line.match(pattern);
    if (match) {
      const [, file, lineStr, columnStr] = match;
      stackLine.file = file;
      stackLine.line = Number(lineStr);
      stackLine.column = Number(columnStr);
      break;
    }
  }
  if (!empty(stackLine)) {
    const content = getFileContents(stackLine.file as string);
    return tracingLocation(
      content,
      stackLine.file as string,
      stackLine.line as number,
      stackLine.column as number,
      stack[0]
    );
  }
  return false;
}

function tracingLocation(
  content: string,
  file: string,
  line: number,
  column: number,
  errorDescription: string
): string {
  const fileLocation = path.relative(basePath(), file);
  const lines = content.split("\n");

  const allLines = lines.map((contentLine, index) => {
    const lineNumber = index + 1;
    const isErrorLine = lineNumber === line;

    return `
      <div id="${
        isErrorLine ? "error-line" : ""
      }" class="group flex items-start ${
      isErrorLine ? "bg-rose-100" : "hover:bg-gray-100"
    } rounded px-4 py-1">
        <div class="w-14 text-right pr-4 text-white-400 select-none">${lineNumber}</div>
        <pre class="flex-1 text-sm overflow-auto whitespace-pre-wrap ${
          isErrorLine
            ? "text-rose-600"
            : "group-hover:text-emerald-600 text-white-800"
        }">${escapeHtml(contentLine)}</pre>
      </div>
      ${
        isErrorLine
          ? `<div class="flex items-start">
              <div class="w-14"></div>
              <pre class="text-sm text-rose-500 pl-4 leading-tight">${" ".repeat(
                column - 1
              )}^</pre>
            </div>`
          : ""
      }
    `;
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Error Trace</title>
      <script src="/system-assets/js/tailwind.js"></script>
      <script>
        window.addEventListener("DOMContentLoaded", () => {
          const el = document.getElementById("error-line");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });
      </script>

    </head>
    <body class="bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900 font-sans antialiased">
      <div class="max-w-6xl mx-auto mt-10 p-6">
        <div class="bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-rose-50">
            <h1 class="text-xl font-semibold text-rose-600">${escapeHtml(
              errorDescription
            )}</h1>
          </div>

          <div class="max-h-[500px] overflow-y-auto bg-gray-900 text-gray-100">
            <div class="py-4">
              ${allLines.join("")}
            </div>
          </div>

          <div class="px-6 py-4 bg-gray-50 text-sm text-gray-700 border-t border-gray-100">
            <p><strong>File:</strong> <code>${fileLocation}</code></p>
            <p><strong>Line:</strong> ${line}</p>
            <p><strong>Column:</strong> ${column}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
