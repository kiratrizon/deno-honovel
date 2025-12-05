import { MiddlewareHandler } from "hono";
import * as path from "node:path";
import ChildKernel from "./ChildKernel.ts";
import HonoClosure from "../Http/HonoClosure.ts";
import { IMyConfig } from "./MethodRoute.ts";
import HonoDispatch from "../Http/HonoDispatch.ts";
import HttpHono from "HttpHono";
import { AbortError, DDError } from "../../Maneuver/HonovelErrors.ts";
import { ContentfulStatusCode } from "http-status";
import { myError } from "../Http/builder.ts";
import { MiddlewareLikeClass } from "Illuminate/Foundation/Http/index.ts";
import { SQLError } from "Illuminate/Database/Query/index.ts";
import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { ModelAttributes } from "../../../../@types/declaration/Base/IBaseModel.d.ts";
import HonoRequest from "HonoHttp/HonoRequest.d.ts";
import { ValidationException } from "Illuminate/Validation/ValidationException.ts";
import { TagContract } from "edge.js/types";
import HonoView from "HonoHttp/HonoView.ts";
import HonoRedirect from "HonoHttp/HonoRedirect.ts";
import { HonoResponse } from "HonoHttp/HonoResponse.ts";
import MessageBag, { ErrorsShape } from "HonoHttp/MessageBag.ts";
import { SessionDataTypes } from "../../../../@types/declaration/imain.d.ts";
import viteConfig from "../../../../../vite/vite-manipulate.ts";

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
  return async (c: MyContext, next: () => Promise<void>) => {
    const { request } = c.get("myHono");
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

    return await next();
  };
}

const defaultHandle: HttpMiddleware = async function ({ request }, next) {
  return next();
};
export type TFallbackMiddleware = [
  "middleware",
  MiddlewareOrDispatch,
  string[],
];
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
        if (part === "*") {
          return `*`;
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

    const constrainedMapping = finalMapping.map((route) => {
      return applyConstraintsWithOptional(route, where);
    });

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
  middleware: [HttpMiddleware, string[]];
  from?: "handle" | "fallback";
}

export function toMiddleware(
  args: (string | HttpMiddleware | MiddlewareLikeClass)[]
): [MiddlewareHandler[], TFallbackMiddleware[]] {
  const instanceKernel = new ChildKernel();
  const MiddlewareGroups = instanceKernel.MiddlewareGroups;
  const RouteMiddleware = instanceKernel.RouteMiddleware;
  const newArgs = args.flatMap((arg) => {
    const middlewareCallback: IMiddlewareCompiler[] = [];
    if (isString(arg)) {
      const [firstKey, ...argParts] = arg.split(":");
      if (!isset(firstKey) || empty(firstKey))
        throw new Error(`Invalid middleware name: ${arg}`);
      if (argParts.length === 0) {
        // if it's in the group middleware
        if (keyExist(MiddlewareGroups, firstKey)) {
          arg = firstKey;
          const middlewareGroup = MiddlewareGroups[arg];

          // map through each middleware in the group
          middlewareGroup.forEach((middleware) => {
            if (isString(middleware)) {
              const [middlewareName, ...middlewareParts] =
                middleware.split(":");
              if (empty(middlewareName)) {
                throw new Error(`Invalid middleware name: ${middleware}`);
              }
              if (keyExist(RouteMiddleware, middlewareName)) {
                middleware = middlewareName;
                const middlewareClass = RouteMiddleware[middleware];
                const middlewareInstance =
                  new (middlewareClass as new () => InstanceType<
                    typeof middlewareClass
                  >)();
                if (
                  methodExist(middlewareInstance, "handle") &&
                  isFunction(middlewareInstance.handle)
                ) {
                  middlewareCallback.push({
                    debugString: `// class ${
                      middlewareClass.name
                    }@handle \n// Code Referrence \n\n${middlewareInstance.handle.toString()}`,
                    middleware: [
                      middlewareInstance.handle.bind(
                        middlewareInstance
                      ) as HttpMiddleware,
                      middlewareParts.flatMap((part) =>
                        part.split(",").map((p) => p.trim())
                      ),
                    ],
                    from:
                      methodExist(middlewareInstance, "fallback") &&
                      isFunction(middlewareInstance.fallback)
                        ? "handle"
                        : undefined,
                  });
                }
                if (
                  methodExist(middlewareInstance, "fallback") &&
                  isFunction(middlewareInstance.fallback)
                ) {
                  if (!methodExist(middlewareInstance, "handle")) {
                    middlewareCallback.push({
                      debugString: "",
                      middleware: [defaultHandle, []],
                      from: "handle",
                    });
                  }
                  middlewareCallback.push({
                    debugString: `// class ${
                      middlewareClass.name
                    }@fallback \n// Code Referrence \n\n${middlewareInstance.fallback.toString()}`,
                    middleware: [
                      middlewareInstance.fallback.bind(
                        middlewareInstance
                      ) as HttpMiddleware,
                      middlewareParts.flatMap((part) =>
                        part.split(",").map((p) => p.trim())
                      ),
                    ],
                    from: "fallback",
                  });
                }
              }
            } else {
              const middlewareInstance = new middleware();
              if (
                methodExist(middlewareInstance, "handle") &&
                isFunction(middlewareInstance.handle)
              ) {
                middlewareCallback.push({
                  debugString: `// class ${
                    middleware.name
                  }@handle \n// Code Referrence \n\n${middlewareInstance.handle.toString()}`,
                  middleware: [
                    middlewareInstance.handle.bind(
                      middlewareInstance
                    ) as HttpMiddleware,
                    [],
                  ],
                  from:
                    methodExist(middlewareInstance, "fallback") &&
                    isFunction(middlewareInstance.fallback)
                      ? "handle"
                      : undefined,
                });
              }
              if (
                methodExist(middlewareInstance, "fallback") &&
                isFunction(middlewareInstance.fallback)
              ) {
                if (!methodExist(middlewareInstance, "handle")) {
                  middlewareCallback.push({
                    debugString: "",
                    middleware: [defaultHandle, []],
                    from: "handle",
                  });
                }
                middlewareCallback.push({
                  debugString: `// class ${
                    middleware.name
                  }@fallback \n// Code Referrence \n\n${middlewareInstance.fallback.toString()}`,
                  middleware: [
                    middlewareInstance.fallback.bind(
                      middlewareInstance
                    ) as HttpMiddleware,
                    [],
                  ],
                  from: "fallback",
                });
              }
            }
          });
        } else if (keyExist(RouteMiddleware, firstKey)) {
          arg = firstKey;

          const middlewareClass = RouteMiddleware[arg];
          const middlewareInstance = new (middlewareClass as new (
            ...args: any[]
          ) => any)();
          if (
            methodExist(middlewareInstance, "handle") &&
            isFunction(middlewareInstance.handle)
          ) {
            middlewareCallback.push({
              debugString: `// class ${
                middlewareClass.name
              }@handle \n// Code Referrence \n\n${middlewareInstance.handle.toString()}`,
              middleware: [
                middlewareInstance.handle.bind(
                  middlewareInstance
                ) as HttpMiddleware,
                argParts.flatMap((part) =>
                  part.split(",").map((p) => p.trim())
                ),
              ],
              from:
                methodExist(middlewareInstance, "fallback") &&
                isFunction(middlewareInstance.fallback)
                  ? "handle"
                  : undefined,
            });
          }
          if (
            methodExist(middlewareInstance, "fallback") &&
            isFunction(middlewareInstance.fallback)
          ) {
            if (!methodExist(middlewareInstance, "handle")) {
              middlewareCallback.push({
                debugString: "",
                middleware: [defaultHandle, []],
                from: "handle",
              });
            }
            middlewareCallback.push({
              debugString: `// class ${
                middlewareClass.name
              }@fallback \n// Code Referrence \n\n${middlewareInstance.fallback.toString()}`,
              middleware: [
                middlewareInstance.fallback.bind(
                  middlewareInstance
                ) as HttpMiddleware,
                argParts.flatMap((part) =>
                  part.split(",").map((p) => p.trim())
                ),
              ],
              from: "fallback",
            });
          }
        }
      } else if (keyExist(RouteMiddleware, firstKey)) {
        arg = firstKey;

        const middlewareClass = RouteMiddleware[arg];
        const middlewareInstance = new (middlewareClass as new (
          ...args: any[]
        ) => any)();
        if (
          methodExist(middlewareInstance, "handle") &&
          isFunction(middlewareInstance.handle)
        ) {
          middlewareCallback.push({
            debugString: `// class ${
              middlewareClass.name
            }@handle \n// Code Referrence \n\n${middlewareInstance.handle.toString()}`,
            middleware: [
              middlewareInstance.handle.bind(
                middlewareInstance
              ) as HttpMiddleware,
              argParts.flatMap((part) => part.split(",").map((p) => p.trim())),
            ],
            from:
              methodExist(middlewareInstance, "fallback") &&
              isFunction(middlewareInstance.fallback)
                ? "handle"
                : undefined,
          });
        }
        if (
          methodExist(middlewareInstance, "fallback") &&
          isFunction(middlewareInstance.fallback)
        ) {
          if (!methodExist(middlewareInstance, "handle")) {
            middlewareCallback.push({
              debugString: "",
              middleware: [defaultHandle, []],
              from: "handle",
            });
          }
          middlewareCallback.push({
            debugString: `// class ${
              middlewareClass.name
            }@fallback \n// Code Referrence \n\n${middlewareInstance.fallback.toString()}`,
            middleware: [
              middlewareInstance.fallback.bind(
                middlewareInstance
              ) as HttpMiddleware,
              argParts.flatMap((part) => part.split(",").map((p) => p.trim())),
            ],
            from: "fallback",
          });
        }
      }
    } else if (isFunction(arg)) {
      const isClass = /^class\s/.test(arg.toString());
      if (isClass) {
        const middlewareClass = arg as MiddlewareLikeClass;
        const middlewareInstance = new (middlewareClass as new (
          ...args: any[]
        ) => any)();
        if (
          methodExist(middlewareInstance, "handle") &&
          isFunction(middlewareInstance.handle)
        ) {
          middlewareCallback.push({
            debugString: `// class ${
              middlewareClass.name
            }@handle \n// Code Referrence \n\n${middlewareInstance.handle.toString()}`,
            middleware: [
              middlewareInstance.handle.bind(
                middlewareInstance
              ) as HttpMiddleware,
              [],
            ],
            from:
              methodExist(middlewareInstance, "fallback") &&
              isFunction(middlewareInstance.fallback)
                ? "handle"
                : undefined,
          });
        }
        if (
          methodExist(middlewareInstance, "fallback") &&
          isFunction(middlewareInstance.fallback)
        ) {
          if (!methodExist(middlewareInstance, "handle")) {
            middlewareCallback.push({
              debugString: "",
              middleware: [defaultHandle, []],
              from: "handle",
            });
          }
          middlewareCallback.push({
            debugString: `// class ${
              middlewareClass.name
            }@fallback \n// Code Referrence \n\n${middlewareInstance.fallback.toString()}`,
            middleware: [
              middlewareInstance.fallback.bind(
                middlewareInstance
              ) as HttpMiddleware,
              [],
            ],
            from: "fallback",
          });
        }
      } else {
        middlewareCallback.push({
          debugString: `// Code Referrence \n\n${arg.toString()}`,
          middleware: [arg as HttpMiddleware, []],
        });
      }
    }
    return middlewareCallback;
  });

  const returnMiddleware: [MiddlewareHandler[], TFallbackMiddleware[]] = [
    [],
    [],
  ];

  newArgs.forEach((args) => {
    const newObj: MiddlewareOrDispatch = {
      debugString: args.debugString,
      args: args.middleware[0],
      from: args.from,
    };

    const param: TFallbackMiddleware = [
      "middleware",
      newObj,
      args.middleware[1] || [],
    ];
    const generatedMiddleware = generateMiddlewareOrDispatch(...param);
    if (args.from == "fallback") {
      returnMiddleware[1].push(param);
    } else {
      returnMiddleware[0].push(generatedMiddleware);
    }
  });
  return returnMiddleware;
}

export function toDispatch(
  objArgs: MiddlewareOrDispatch,
  sequenceParams: string[]
): MiddlewareHandler {
  objArgs.from = "dispatch";
  return generateMiddlewareOrDispatch("dispatch", objArgs, sequenceParams);
}

export function toNotfound(
  objArgs: MiddlewareOrDispatch,
  sequenceParams: string[]
): MiddlewareHandler {
  objArgs.from = "notfound";
  return generateMiddlewareOrDispatch("notfound", objArgs, sequenceParams);
}

interface MiddlewareOrDispatch {
  debugString: string;
  args: HttpMiddleware | IMyConfig["callback"];
  from?: "handle" | "fallback" | "dispatch" | "notfound";
}
function generateMiddlewareOrDispatch(
  type: "middleware" | "dispatch" | "notfound",
  objArgs: MiddlewareOrDispatch,
  sequenceParams: string[] = []
): MiddlewareHandler {
  if (type !== "notfound") {
    const from = objArgs.from;
    return async (c: MyContext, next: () => Promise<void>) => {
      if (c.get("stopMiddleware") === true) {
        return await next();
      }
      const myHono = c.get("myHono");
      const request = myHono.request;
      let middlewareResp;
      // @ts-ignore //
      request.resetRoute({
        ...c.get("subdomain"),
        ...c.req.param(),
      });

      const { args, debugString } = objArgs;
      if (!isFunction(args)) {
        return await myError(c);
      } else {
        let resp: Response | undefined; // build response
        let isNext = false;
        try {
          if (type === "middleware") {
            const honoClosure = c.get("honoClosure");
            middlewareResp = await (args as HttpMiddleware)(
              myHono,
              // @ts-ignore //
              honoClosure.next.bind(honoClosure),
              ...sequenceParams
            );
          } else {
            const params = request.route() as Record<string, string | null>;
            const newParams: Record<
              string,
              Model<ModelAttributes> | string | null
            > = {};
            sequenceParams.forEach((param) => {
              if (keyExist(params, param)) {
                newParams[param] = params[param] ?? null;
              } else {
                newParams[param] = null;
              }
            });
            // @ts-ignore //
            const bindedModels = request.bindedModels as Record<
              string,
              typeof Model<ModelAttributes>
            >;
            for (const paramKey of Object.keys(newParams)) {
              if (keyExist(bindedModels, paramKey)) {
                const modelClass = bindedModels[paramKey];
                if (!isNull(newParams[paramKey])) {
                  try {
                    newParams[paramKey] = await modelClass.findOrFail(
                      newParams[paramKey] as string
                    );
                    continue;
                  } catch (_e: unknown) {
                    abort(404, (_e as Error).message);
                  }
                }
                abort(404);
              }
            }
            middlewareResp = await args(myHono, ...Object.values(newParams));
          }
          if (isNull(middlewareResp) && type === "dispatch") {
            resp = c.json(null);
          } else {
            // @ts-ignore //
            const dispatch = new HonoDispatch(middlewareResp, type);
            if (
              (type === "middleware" && !dispatch.isNext) ||
              type === "dispatch"
            ) {
              const result = (await dispatch.build(c)) as Response;
              resp = result;
            } else if (type === "middleware" && dispatch.isNext) {
              isNext = true;
            }
          }
        } catch (e: unknown) {
          resp = await handleErrors(e, c, request);
        }
        if (!isUndefined(middlewareResp)) {
          if (isNext) {
            if (from === "handle" && c.get("response") === null) {
              // increment fromHandle
              c.set("fromHandle", c.get("fromHandle") + 1);
            }
            return await next();
          }
        }
        if (isset(resp)) {
          c.set("response", resp);
          c.set("stopMiddleware", true);
          return await next();
        } else {
          if (["dispatch"].includes(type)) {
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
          consoledeno.debug(
            debuggingPurpose,
            "error",
            `Request URI ${request.method.toUpperCase()} ${request.path()}\nRequest ID ${request.server(
              "HTTP_X_REQUEST_ID"
            )}`
          );
          return c.json(
            {
              message: "Internal server error",
            },
            500
          );
        }
      }
    };
  } else {
    return async (c: MyContext) => {
      const myHono = c.get("myHono");
      const request = myHono.request;
      const func = objArgs.args as IMyConfig["callback"];
      let respond: Response;
      try {
        // @ts-ignore //
        const resp = await func(myHono);
        // @ts-ignore //
        const dispatch = new HonoDispatch(resp, type);
        respond = (await dispatch.build(c)) as Response;
      } catch (e: unknown) {
        respond = await handleErrors(e, c, request);
      }

      return new Response(respond.body, {
        status: 404,
        headers: respond.headers,
      });
    };
  }
}

export function toFallback([count, fallbackParams]: [
  number,
  TFallbackMiddleware,
]) {
  return generateFallback(...fallbackParams, count);
}

function generateFallback(
  type: "middleware",
  objArgs: MiddlewareOrDispatch,
  sequenceParams: string[] = [],
  count = 0
): MiddlewareHandler {
  return async (c: MyContext, next: () => Promise<void>) => {
    const fromHandle = c.get("fromHandle");
    if (count !== fromHandle) {
      return await next();
    }
    c.set("fromHandle", fromHandle - 1);
    const myHono = c.get("myHono");
    const request = myHono.request;
    let middlewareResp;
    // @ts-ignore //
    request.resetRoute({
      ...c.get("subdomain"),
      ...c.req.param(),
    });
    const { args, debugString } = objArgs;
    if (!isFunction(args)) {
      return await myError(c);
    } else {
      let resp: Response | undefined; // build response
      let isNext = false;
      try {
        const honoClosure = c.get("honoClosure");
        middlewareResp = await (args as HttpMiddleware)(
          myHono,
          // @ts-ignore //
          honoClosure.next.bind(honoClosure),
          ...sequenceParams
        );
        if (isNull(middlewareResp)) {
          resp = c.json(null);
        } else {
          const dispatch = new HonoDispatch(middlewareResp, type);
          if (type === "middleware" && !dispatch.isNext) {
            const result = (await dispatch.build(c)) as Response;
            resp = result;
          } else if (type === "middleware" && dispatch.isNext) {
            isNext = true;
          }
        }
      } catch (e: unknown) {
        resp = await handleErrors(e, c, request);
      }
      if (!isUndefined(middlewareResp)) {
        if (isNext) {
          return await next();
        }
      }
      if (isset(resp)) {
        await request.dispose();
        return resp;
      } else {
        const debuggingPurpose = renderDebugErrorPage(
          `${ucFirst(type)} Error`,
          debugString,
          `Returned undefined value from the ${type} function.`
        );
        if (!isset(env("DENO_DEPLOYMENT_ID"))) {
          return c.html(debuggingPurpose, 500);
        }
        consoledeno.debug(
          debuggingPurpose,
          "error",
          `Request URI ${request.method.toUpperCase()} ${request.path()}\nRequest ID ${request.server(
            "HTTP_X_REQUEST_ID"
          )}`
        );
        return c.json(
          {
            message: "Internal server error",
          },
          500
        );
      }
    }
  };
}

export const returnResponse = async (c: MyContext) => {
  const response = c.get("response");
  // dispose session
  const myHono = c.get("myHono");
  await myHono.request.dispose();
  return response;
};

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
  return async (c: MyContext, next: () => Promise<void>) => {
    c.set("myHono", new HttpHono(c));
    c.set("honoClosure", new HonoClosure(c));
    c.set("fromHandle", 0);
    c.set("response", null);
    c.set("stopMiddleware", false);
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
  <pre><code>${Deno.inspect(newData, {
    colors: false,
    depth: Infinity,
  })}</code></pre>
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
async function extractControllerTrace(
  stack: string[]
): Promise<string | false> {
  const patterns = [
    /file:\/\/(.+\/app\/Http\/Controllers\/[^:]+):(\d+):(\d+)/,
    /file:\/\/(.+\/app\/Http\/Middlewares\/[^:]+):(\d+):(\d+)/,
    // ✅ Add more here later if needed
    // /file:\/\/(.+\/app\/Models\/[^:]+):(\d+):(\d+)/,
  ];

  const stackLine: Record<string, unknown> = {};

  for (const line of stack) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, file, lineStr, columnStr] = match;

        // ✅ Normalize Windows drive paths (/D:/… → D:/…)
        const normalizedPath = file.replace(/^\/([A-Za-z]:)/, "$1");

        stackLine.file = normalizedPath;
        stackLine.line = Number(lineStr);
        stackLine.column = Number(columnStr);

        break; // ✅ Break inner loop
      }
    }
    if (stackLine.file) break; // ✅ Break outer loop once found
  }

  if (!empty(stackLine) && (await pathExist(stackLine.file as string))) {
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
  const fileLocation = path.relative(basePath(), file).replace(/\\/g, "/");
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

async function handleErrors(
  e: unknown,
  c: MyContext,
  request: HonoRequest
): Promise<Response> {
  let resp: Response | undefined;
  if (e instanceof DDError) {
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
        resp = c.json(data.json, 200);
      }
    } else {
      resp = c.html(data.html, 200);
    }
  } else if (e instanceof AbortError) {
    if (request.expectsJson()) {
      resp = e.toJson();
    } else {
      const data = isString(e.msg) ? e.msg : `Error: ${e.code} - ${e.msg}`;
      resp = await myError(c, e.code as ContentfulStatusCode, data);
    }
  } else if (e instanceof SQLError) {
    if (request.expectsJson()) {
      resp = c.json(
        {
          message: e.message,
          error_type: e.name,
        },
        500
      );
    } else {
      resp = c.html(renderErrorHtml(e), 500);
    }
  } else if (e instanceof ValidationException) {
    const action = e.response;
    resp = await handleAction(action, c);
  } else if (e instanceof Error) {
    // populate e with additional information
    const populatedError: Record<string, unknown> = {};
    populatedError["error_type"] = e.name.trim();
    populatedError["message"] = e.message.trim();
    populatedError["stack"] = e.stack
      ? e.stack.split("\n").map((line) => line.trim())
      : [];
    populatedError["cause"] = e.cause;
    let errorHtml: string;
    if (env("APP_DEBUG", true)) {
      if (!request.expectsJson()) {
        errorHtml =
          (await extractControllerTrace(populatedError.stack as string[])) ||
          renderErrorHtml(e);
        resp = c.html(errorHtml, 500);
      } else {
        resp = c.json(
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
      consoledeno.error(populatedError);
      resp = c.html("Internal server error", 500);
    }
  } else {
    consoledeno.error("Unexpected error:", e);
    resp = c.json({ message: "Internal server error" }, 500);
  }

  return resp as Response;
}

export async function handleAction(
  data: unknown,
  c: MyContext
): Promise<Response> {
  const request = c.get("myHono").request;
  const Cookie = c.get("myHono").Cookie;
  let statusCode: ContentfulStatusCode = 200;
  if (data instanceof Response) {
    return convertToResponse(c, data);
  }
  if (isObject(data)) {
    if (data instanceof HonoView) {
      const errors = request.session.get("errors");
      // console.log("errors", errors);
      const edgeGlobals = {
        session: function () {
          return request.session;
        },
        env: env,
        request: function () {
          return request;
        },
        config: function (key: string, defaultValue: unknown = null) {
          return c.get("myHono").Configure.read(key, defaultValue);
        },
        auth: function () {
          return c.get("myHono").Auth;
        },
        method: (types: string | string[]) => {
          const arr = Array.isArray(types) ? types : [types];
          return arr
            .map(
              (type) =>
                `<input type="hidden" name="_method" value="${type.toUpperCase()}">`
            )
            .join("");
        },
        old: function (key: string, defaultValue: unknown = null) {
          const oldInput = (request.session.get("_old_input") || {}) as Record<
            string,
            unknown
          >;
          return oldInput[key] ?? defaultValue;
        },
        csrf: () => {
          return `<input type="hidden" name="_token" value="${
            request.session.get("_token") || ""
          }">`;
        },
        csrfMeta: () =>
          `<meta name="csrf-token" content="${
            request.session.get("_token") || ""
          }">`,
        errors: new MessageBag((errors || {}) as ErrorsShape),
        consoledeno: consoledeno,
      };
      // @ts-ignore /
      data.addGlobal(edgeGlobals);
      const tags: Array<TagContract> = [
        {
          tagName: "csrf", // becomes @csrf
          block: false,
          seekable: true,
          compile: (parser, buffer, token) => {
            buffer.outputRaw(
              `<input type="hidden" name="_token" value="${
                request.session.get("_token") || ""
              }">`
            );
          },
        },
        {
          tagName: "method",
          block: false,
          seekable: true,
          compile: (parser, buffer, token) => {
            // token.properties.jsArg contains the evaluated arguments
            let out = "";
            const types = token.properties.jsArg || "''";
            const arr = Array.isArray(types) ? types : [types];
            out += arr
              .map(
                (t) =>
                  '<input type="hidden" name="_method" value="' +
                  t.toUpperCase() +
                  '">'
              )
              .join("");

            buffer.outputRaw(out);
          },
        },
        {
          tagName: "vite",
          block: false,
          seekable: true,

          compile(parser, buffer, token) {
            const raw = token.properties.jsArg; // this is a string
            let args: string[] = [];

            try {
              // Remove single quotes if necessary and parse
              const cleaned = raw.replace(/'/g, '"'); // ' -> "
              const parsed = JSON.parse(cleaned);

              if (Array.isArray(parsed)) {
                args = parsed.map(String);
              } else if (typeof parsed === "string") {
                args = [parsed];
              }
            } catch {
              args = [];
            }
            if (args.length && isArray(args)) {
              if (
                config("app").env === "local" &&
                // @ts-ignore //
                typeof viteServer !== "undefined" &&
                // @ts-ignore //
                viteServer
              ) {
                const port = viteConfig?.server?.port || 5173;
                args.forEach((file) => {
                  if (
                    file.toLowerCase().endsWith(".js") ||
                    file.toLowerCase().endsWith(".ts")
                  ) {
                    buffer.outputRaw(
                      `<script type="module" src="http://localhost:${port}/${file}"></script>`
                    );
                  } else if (file.toLowerCase().endsWith(".css")) {
                    buffer.outputRaw(
                      `<link rel="stylesheet" href="http://localhost:${port}/${file}">`
                    );
                  }
                });
              } else {
                // find the manifest.json under use deno readfile

                const pathOfOutdir = viteConfig.build?.outDir || "public/build";

                const viteJson = Deno.readTextFileSync(
                  basePath(`${pathOfOutdir}/.vite/manifest.json`)
                );
                try {
                  const manifest = JSON.parse(viteJson);
                  // remove trailing slash
                  const staticPath = pathOfOutdir.replace("public/", "");
                  args.forEach((file) => {
                    const entry = manifest[file];
                    if (entry && entry.file) {
                      if (file.endsWith(".js") || file.endsWith(".ts")) {
                        const css = entry.css || [];
                        css.forEach((cssFile: string) => {
                          buffer.outputRaw(
                            `<link rel="stylesheet" href="/${staticPath}/${cssFile}">`
                          );
                        });
                        buffer.outputRaw(
                          `<script type="module" src="/${staticPath}/${entry.file}"></script>`
                        );
                      } else if (entry.file.endsWith(".css")) {
                        buffer.outputRaw(
                          `<link rel="stylesheet" href="/${staticPath}/${entry.file}">`
                        );
                      }
                    }
                  });
                } catch {
                  // handle error
                }
              }
            }
          },
        },
      ];
      // @ts-ignore //
      data.addTags(tags);

      const rendered = await data.element();
      statusCode = 200;
      // move all new to old
      const sessionFlashData = request.session.get(
        "_flash"
      ) as SessionDataTypes["_flash"];
      const old = sessionFlashData.old;
      const newData = sessionFlashData.new;
      // merge
      const merged = [...old, ...newData];
      request.session.put("_flash", {
        old: [...merged],
        new: [],
      });
      return c.html(rendered, 200);
    } else if (data instanceof HonoRedirect) {
      const sessionFlashData = request.session.get(
        "_flash"
      ) as SessionDataTypes["_flash"];
      const old = sessionFlashData.old;
      const newData = sessionFlashData.new;
      // merge
      const merged = [...old, ...newData];
      request.session.put("_flash", {
        old: [],
        new: [...merged],
      });
      switch (data.type) {
        case "back":
          // @ts-ignore //
          return c.redirect(request.session.get("_previous.url") || "/", 302);
        case "redirect":
        case "to":
        case "route":
          return c.redirect(data.getTargetUrl(), 302);
        default:
          throw new Error("Invalid use of redirect()");
      }
    } else if (data instanceof HonoResponse) {
      // @ts-ignore //
      const cookies = data.getCookies();
      for (const [name, [value, options]] of Object.entries(cookies)) {
        Cookie.queue(name, value, options);
      }
      // @ts-ignore //
      const res = data.toResponse();

      return convertToResponse(c, res);
    } else {
      return c.text(JSON.stringify(data, null, 2), statusCode);
    }
  } else {
    if (isString(data)) {
      return c.text(data, statusCode);
    } else {
      return c.text(JSON.stringify(data, null, 2), statusCode);
    }
  }
}

export function convertToResponse(c: MyContext, res: Response): Response {
  const newRes = c.newResponse(
    res.body,
    res.status as ContentfulStatusCode,
    Object.fromEntries(res.headers)
  );
  return newRes;
}
