import "../hono-globals/hono-index.ts";
import { logger } from "hono/logger";
// import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "hono/deno";
import * as path from "node:path";

import { Hono, MiddlewareHandler, Next } from "hono";
import Boot from "../Maneuver/Boot.ts";

import { HonoType } from "../../../@types/declaration/imain.d.ts";

import { INRoute } from "../../../@types/declaration/IRoute.d.ts";
import {
  buildRequestInit,
  regexToHono,
  TFallbackMiddleware,
  toDispatch,
  toMiddleware,
  URLArranger,
  toFallback,
  returnResponse,
  toNotfound,
} from "./Support/FunctionRoute.ts";
import { IMyConfig } from "./Support/MethodRoute.ts";
import { honoSession } from "HonoHttp/HonoSession.ts";
import { Route as Router } from "Illuminate/Support/Facades/index.ts";
const Route = Router as typeof INRoute;

const warmUpdispatch: HttpDispatch = async () => {
  return response("");
};

import ChildKernel from "./Support/ChildKernel.ts";
import GroupRoute from "./Support/GroupRoute.ts";
import { myError } from "HonoHttp/builder.ts";
import { PublicDiskConfig } from "configs/@types/index.d.ts";
import { extname } from "node:path";
import { contentType } from "https://deno.land/std@0.224.0/media_types/mod.ts";

function serveDiskStatic(urlPrefix: string, diskRoot: string) {
  // Normalize URL prefix (remove trailing slash)
  urlPrefix = "/" + urlPrefix.replace(/^\/+|\/+$/g, "");

  return async (c: any, next: () => Promise<void>) => {
    const reqPath = c.req.path; // full path requested
    if (!reqPath.startsWith(urlPrefix)) {
      return next();
    }

    // Map URL path to filesystem path
    const relativePath = reqPath.slice(urlPrefix.length).replace(/^\/+/, "");
    const filePath = path.join(diskRoot, relativePath);

    try {
      const fileStat = await Deno.stat(filePath);
      if (fileStat.isDirectory) {
        return c.text("Forbidden", 403);
      }

      const data = await Deno.readFile(filePath);
      const mimeType =
        contentType(extname(filePath)) || "application/octet-stream";
      c.header("Content-Type", mimeType);
      return c.body(data);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return next(); // Let other routes handle 404
      }
      return c.text("Internal Server Error", 500);
    }
  };
}

import inlineConfig from "../../../../vite/vite-manipulate.ts";
const vitePort = inlineConfig?.server?.port || 5173;

// Check if a Vite server is actually responding
const isViteRunning = async (port: number): Promise<boolean> => {
  try {
    const resp = await fetch(`http://127.0.0.1:${port}`, { method: "GET" });
    return resp.status < 500; // true if server responds
  } catch (_e) {
    return false; // connection refused or server not up
  }
};

if (config("app").env === "local") {
  const viteServer = await isViteRunning(vitePort);
  define("viteServer", viteServer, false);

  if (viteServer) {
    console.info("✅ Vite server is running");
  } else {
    // console.info("⚡ Vite server is not running");
  }
}

const headFunction: MiddlewareHandler = async (
  c: MyContext,
  next: () => Promise<void>,
) => {
  const { request } = c.get("myHono");
  if (!request.isMethod("HEAD")) {
    return await myError(c);
  }
  return await next();
};
// Moved to RouteHelpers.ts
const domainGroup = createDomainGroup;

import {
  convertLaravelDomainToWildcard,
  domainGroup as createDomainGroup,
  matchesDomainPattern,
  extractHost,
  validateRouteName,
  registerRoute,
  buildRouteUrl,
} from "./Support/RouteHelpers.ts";

const myStaticDefaults: MiddlewareHandler[] = [
  serveStatic({ root: path.relative(Deno.cwd(), publicPath()) }),
  serveStatic({
    root: path.relative(Deno.cwd(), honovelPath("hono/hono-assets")),
  }),
];

const [globalMiddleware, globalMiddlewareFallback]: [
  MiddlewareHandler[],
  TFallbackMiddleware[],
] = [...toMiddleware(new ChildKernel().Middleware)];

// domain on beta test
const _forDomain: MiddlewareHandler = async (
  c: MyContext,
  next: () => Promise<void>,
) => {
  const requestUrl = new URL(c.req.url);
  const appUrl = env("APP_URL", "").toLowerCase();
  const incomingUrl = buildIncomingUrl(requestUrl);
  const key: string = c.req.raw.url.startsWith("/api/") ? "api" : "web";

  if (!incomingUrl.startsWith(appUrl)) {
    const host = extractHost(c.req.raw.url);

    // Direct match
    if (keyExist(Server.domainPattern[key], host)) {
      return await Server.domainPattern[key][host].fetch(c.req.raw);
    }

    // Wildcard pattern match
    for (const pattern in Server.domainPattern[key]) {
      if (matchesDomainPattern(pattern, host)) {
        return await Server.domainPattern[key][pattern].fetch(c.req.raw);
      }
    }

    return await myError(c);
  }

  return await next();
};

/**
 * Build incoming URL from request
 */
function buildIncomingUrl(requestUrl: URL): string {
  const [protocol, domain] = requestUrl.toString().toLowerCase().split("://");
  const [incoming, uri] = domain.split("/");

  let incomingHost: string;
  if (isset(env("DENO_DEPLOYMENT_ID"))) {
    incomingHost = incoming.replace(`-${env("DENO_DEPLOYMENT_ID", "")}`, "");
  } else {
    incomingHost = incoming;
  }

  return `${protocol}://${incomingHost}/${uri || ""}`;
}

class Server {
  private static Hono = Hono;
  public static app: HonoType;
  public static domainPattern: Record<string, Record<string, HonoType>> = {};

  public static routes: Record<
    string,
    {
      url: string;
      requiredParams: string[];
      optionalParams: string[];
    }
  > = {};
  public static async init() {
    await Boot.init();
    this.app = await this.generateNewApp({}, true);
    const conditionalLogger = async (c: any, next: () => Promise<void>) => {
      const url = c.req.url;
      // skip if path ends with __warmup
      if (!url.endsWith("__warmup")) {
        await logger()(c, next); // call logger middleware
      } else {
        return await next(); // skip logger
      }
    };

    this.app.use(conditionalLogger);

    if (!env("DENO_DEPLOYMENT_ID", null)) {
      const disks = config("filesystems").disks || {};

      for (const [, diskConfig] of Object.entries(disks)) {
        const disk = diskConfig as PublicDiskConfig;

        if (
          ["local", "public"].includes(disk.driver) &&
          disk.visibility === "public" &&
          disk.root &&
          disk.url
        ) {
          let basePath = disk.url;
          if (disk.url.startsWith("http")) {
            basePath = new URL(disk.url).pathname;
          }
          this.app.use(serveDiskStatic(basePath, disk.root));
        }
      }
    }

    const allProviders = config("app").providers || [];

    for (const ProviderClass of allProviders) {
      // Optional: Skip base AppServiceProvider if it was added

      // @ts-ignore //
      const providerInstance = new ProviderClass(this.app as Hono);

      await providerInstance.register();
      await providerInstance.boot();
    }
    await Boot.finalInit();
    if (isset(env("PHPMYADMIN_HOST"))) {
      this.app.get("/myadmin", async (c: MyContext) => {
        return c.redirect("/myadmin/", 301);
      });
      this.app.all("/myadmin/*", async (c: MyContext) => {
        const targetUrl = `${env("PHPMYADMIN_HOST")}${c.req.path.replace(
          "/myadmin",
          "",
        )}${c.req.query() ? `?${c.req.raw.url.split("?")[1]}` : ""}`;

        const headers = new Headers(c.req.raw.headers);

        // Clone body safely (handle GET without body)
        let body: BodyInit | null = null;
        if (c.req.method !== "GET" && c.req.method !== "HEAD") {
          const rawBody = await c.req.raw.arrayBuffer();
          body = rawBody.byteLength > 0 ? rawBody : null;
        }

        const response = await fetch(targetUrl, {
          method: c.req.method,
          headers,
          body,
        });

        // Clone response headers safely (some need to be removed)
        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete("content-encoding"); // remove problematic headers if needed

        const responseBody = await response.arrayBuffer();
        return new Response(responseBody, {
          status: response.status,
          headers: responseHeaders,
        });
      });
    }

    // initialize the app
    await this.loadAndValidateRoutes();
    this.endInit();
  }

  private static async generateNewApp(
    conf?: Record<string, unknown>,
    withDefaults: boolean = false,
  ): Promise<HonoType> {
    let app: HonoType;
    if (isset(conf) && !empty(conf)) {
      app = new this.Hono(conf);
    } else {
      app = new this.Hono();
    }

    if (withDefaults) {
      app.use(...myStaticDefaults);
      app.use("*", async (c: MyContext, next: () => Promise<void>) => {
        c.set("subdomain", {});
        return await next();
      });
    }
    return app;
  }

  private static applyMainMiddleware(
    filePath: string,
    app: HonoType,
  ): [string, TFallbackMiddleware[]] {
    const mainMiddleware = [];
    // @ts-ignore //
    const groupRoutes = GroupRoute.groupRouteMain as Record<
      string,
      { middleware: string[]; prefix?: string }
    >;
    if (isset(groupRoutes) && !empty(groupRoutes)) {
      if (isset(groupRoutes[filePath]) && keyExist(groupRoutes, filePath)) {
        mainMiddleware.push(...groupRoutes[filePath].middleware);
      }
    }

    const [routeGroupMiddleware, routeGroupMiddlewareFallback]: [
      MiddlewareHandler[],
      TFallbackMiddleware[],
    ] = [...toMiddleware(mainMiddleware)];
    // @ts-ignore //
    app.use(
      "*",
      honoSession(),
      buildRequestInit(),
      // build the globalMiddlewareHere
      ...globalMiddleware,
      ...routeGroupMiddleware,
    );
    // return the prefix if exists
    return [groupRoutes[filePath]?.prefix || "/", routeGroupMiddlewareFallback];
  }

  private static async loadAndValidateRoutes() {
    const routePath = basePath("routes");
    const routeFiles: string[] = [];

    for await (const entry of Deno.readDir(routePath)) {
      if (entry.isFile && entry.name.endsWith(".ts")) {
        routeFiles.push(entry.name);
      }
    }
    const webIndex = routeFiles.indexOf("web.ts");
    let webmts = false;
    if (webIndex !== -1) {
      routeFiles.splice(webIndex, 1);
      webmts = true;
    }
    if (webmts) {
      // push it to the end of the array
      routeFiles.push("web.ts");
    }
    for (const file of routeFiles) {
      const key = file.replace(".ts", "");
      // let route: typeof INRoute;
      try {
        if (file === "web.ts") {
          await import("../../../../../routes/web.ts");
          // route = Route as typeof INRoute;
        } else if (file === "api.ts") {
          await import("../../../../../routes/api.ts");
          // route = Route as typeof INRoute;
        }
      } catch (err) {
        console.warn(`Route file "${file}" could not be loaded.`, err);
      }
      const filePath = basePath(`routes/${file}`);
      if (isset(Route)) {
        Server.domainPattern[key] = {};
        const byEndpointsRouter = await this.generateNewApp();
        const [routePrefix, routeGroupMiddlewareFallback] =
          this.applyMainMiddleware(filePath, byEndpointsRouter);
        const instancedRoute = new Route();
        const allGroup = instancedRoute.getAllGroupsAndMethods();

        const {
          groups,
          methods,
          defaultRoute,
          defaultResource,
          resourceReferrence,
        } = allGroup;
        if (isset(methods) && !empty(methods)) {
          if (!empty(defaultResource)) {
            for (const di of defaultResource) {
              const resourceUse = resourceReferrence[String(di)];
              const myResourceRoute = resourceUse.myRouters;
              if (!empty(myResourceRoute)) {
                Object.assign(defaultRoute, myResourceRoute);
              }
            }
          }
          if (isset(defaultRoute) && !empty(defaultRoute)) {
            const defaultMethods = Object.entries(defaultRoute);
            for (const [routeId, methodarr] of defaultMethods) {
              const routeUsed = methods[routeId];
              const flag = routeUsed.myFlag;
              const flagWhere = flag.where || {};
              const flagName = flag.name || "";
              const flagMiddleware = flag.middleware || [];

              const myConfig = routeUsed.config;
              // custom request class handling
              const customRequestClass = myConfig.customRequest;
              const arrangerDispatch = URLArranger.urlCombiner(myConfig.uri);
              const newApp = await this.generateNewApp();

              const splittedUri = URLArranger.generateOptionalParamRoutes(
                arrangerDispatch.string,
                "dispatch",
                flagWhere,
              );
              if (flagName !== "") {
                const fixUri = buildRouteUrl(routePrefix, myConfig.uri);
                if (validateRouteName(this.routes, flagName)) {
                  registerRoute(
                    this.routes,
                    flagName,
                    fixUri,
                    arrangerDispatch.requiredParams,
                    arrangerDispatch.optionalParams,
                  );
                }
              }

              const returnedDispatch = toDispatch(
                {
                  args: myConfig.callback as IMyConfig["callback"],
                  debugString: myConfig.debugString,
                  customRequest: customRequestClass,
                },
                arrangerDispatch.sequenceParams,
              );
              const [flagMiddlewareArr, flagMiddlewareFallback]: [
                MiddlewareHandler[],
                TFallbackMiddleware[],
              ] = toMiddleware([...flagMiddleware]);
              const toFallbacks = [
                ...globalMiddlewareFallback,
                ...routeGroupMiddlewareFallback,
                ...flagMiddlewareFallback,
              ];
              const fallBacksArr: MiddlewareHandler[] = [];
              for (let i = 0; i < toFallbacks.length; i++) {
                fallBacksArr.unshift(toFallback([i + 1, toFallbacks[i]]));
              }

              const allBuilds = [
                ...flagMiddlewareArr,
                returnedDispatch as MiddlewareHandler,
                ...fallBacksArr,
                returnResponse,
              ];
              if (methodarr.length === 1 && arrayFirst(methodarr) === "head") {
                allBuilds.splice(1, 0, headFunction);
                splittedUri.forEach((str) => {
                  // @ts-ignore //
                  newApp.get(str, ...allBuilds);
                });
              } else {
                // @ts-ignore //
                newApp.on(
                  methodarr.map((m) => m.toUpperCase()),
                  splittedUri,
                  ...allBuilds,
                );
              }
              byEndpointsRouter.route("/", newApp);
            }
          }

          const warmUpFallbacks: TFallbackMiddleware[] = [
            ...globalMiddlewareFallback,
            ...routeGroupMiddlewareFallback,
          ];
          const warmUpFallbacksArr: MiddlewareHandler[] = [];
          warmUpFallbacks.forEach((fb, index) => {
            warmUpFallbacksArr.unshift(toFallback([index + 1, fb]));
          });

          const warmUpBuilds = [
            toDispatch({ args: warmUpdispatch, debugString: "" }, []),
            ...warmUpFallbacksArr,
            returnResponse,
          ];
          const warmUpApp = await this.generateNewApp();
          // @ts-ignore //
          warmUpApp.get("/__warmup", ...warmUpBuilds);
          byEndpointsRouter.route("/", warmUpApp);

          // for groups
          if (isset(groups) && !empty(groups) && isObject(groups)) {
            const groupKeys = Object.keys(groups);
            for (const groupKey of groupKeys) {
              let hasDomain = false;
              let domainName = "";
              const myNewGroup = await this.generateNewApp();

              const myGroup = groups[groupKey];
              // @ts-ignore //
              const resourceRoutes = myGroup.resourceRoutes as number[];
              for (const di of resourceRoutes) {
                const resourceUse = resourceReferrence[String(di)];
                const myResourceRoute = resourceUse.myRouters;
                if (!empty(myResourceRoute)) {
                  // @ts-ignore //
                  Object.assign(myGroup.onRoutes, myResourceRoute);
                }
              }
              const {
                as = "",
                domain = null,
                where = {},
                middleware = [],
                name = "",
              } = myGroup.flagConfig;

              const domainParam: string[] = [];
              const groupMiddleware: MiddlewareHandler[] = [];

              if (isset(domain) && !empty(domain)) {
                domainName = convertLaravelDomainToWildcard(domain);

                const domainArranger = URLArranger.urlCombiner(
                  domain.split("."),
                  false,
                );
                domainArranger.string = domainArranger.string
                  .slice(1)
                  .split("/")
                  .join(".");
                myNewGroup.use("*", domainGroup(domainName, domainArranger));
                domainParam.push(...domainArranger.sequenceParams);
                hasDomain = true;
                Server.domainPattern[key][domainName] =
                  await this.generateNewApp({}, true);
                groupMiddleware.push(regexToHono(where, domainParam));
              }
              let newName = "";
              if (!empty(name)) {
                newName = (name.replace(/\*\d+\*/g, "") || "/").replace(
                  /\/+/g,
                  "/",
                );
              }

              const groupEntries = Object.entries(myGroup.myRoutes);
              const arrangerGroup = URLArranger.urlCombiner(newName, true);
              const [myGroupMiddleware, myGroupMiddlewareFallback]: [
                MiddlewareHandler[],
                TFallbackMiddleware[],
              ] = toMiddleware(middleware);
              groupEntries.forEach(([routeId, methodarr]) => {
                const routeUsed = methods[routeId];
                const myConfig = routeUsed.config;
                // custom request class handling
                const customRequestClass = myConfig.customRequest;
                const flag = routeUsed.myFlag;
                const myParam: string[] = [...domainParam];
                const combinedGroupDispatch = URLArranger.urlCombiner([
                  newName,
                  myConfig.uri,
                ]);
                myParam.push(...combinedGroupDispatch.sequenceParams);
                const returnedDispatch = toDispatch(
                  {
                    args: myConfig.callback as IMyConfig["callback"],
                    debugString: myConfig.debugString,
                    customRequest: customRequestClass,
                  },
                  myParam,
                );
                // console.debug(myParam);
                const arrangerDispatch = URLArranger.urlCombiner(myConfig.uri);
                const newMethodUri = arrangerDispatch.string;

                const newGroupMiddleware: MiddlewareHandler[] = [
                  ...groupMiddleware,
                ];

                const flagWhere = flag.where || {};
                const splittedUri = URLArranger.generateOptionalParamRoutes(
                  newMethodUri,
                  "dispatch",
                  flagWhere,
                );
                const flagName = flag.name || "";
                if (flagName !== "") {
                  const finalName = !empty(as) ? `${as}.${flagName}` : flagName;
                  const finalUrl = buildRouteUrl(
                    routePrefix,
                    `${arrangerGroup.string}${myConfig.uri}`,
                  );

                  if (validateRouteName(this.routes, finalName)) {
                    registerRoute(
                      this.routes,
                      finalName,
                      finalUrl,
                      arrangerDispatch.requiredParams,
                      arrangerDispatch.optionalParams,
                    );
                  }
                }
                const flagMiddleware = flag.middleware || [];
                const [flagMiddlewareArr, flagMiddlewareFallback]: [
                  MiddlewareHandler[],
                  TFallbackMiddleware[],
                ] = toMiddleware([...flagMiddleware]);
                const toFallbacks = [
                  ...globalMiddlewareFallback,
                  ...routeGroupMiddlewareFallback,
                  ...myGroupMiddlewareFallback,
                  ...flagMiddlewareFallback,
                ];
                const fallBacksArr: MiddlewareHandler[] = [];
                for (let i = 0; i < toFallbacks.length; i++) {
                  fallBacksArr.unshift(toFallback([i + 1, toFallbacks[i]]));
                }
                newGroupMiddleware.push(...flagMiddlewareArr);
                const allBuilds = [
                  ...myGroupMiddleware,
                  ...newGroupMiddleware,
                  returnedDispatch as MiddlewareHandler,
                  ...fallBacksArr,
                  returnResponse,
                ];

                if (
                  methodarr.length === 1 &&
                  arrayFirst(methodarr) === "head"
                ) {
                  allBuilds.splice(1, 0, headFunction);
                  splittedUri.forEach((str) => {
                    // @ts-ignore //
                    myNewGroup.get(str, ...allBuilds);
                  });
                } else {
                  // @ts-ignore //
                  myNewGroup.on(
                    methodarr.map((m) => m.toUpperCase()),
                    splittedUri,
                    ...allBuilds,
                  );
                }
              });
              const newAppGroup = await this.generateNewApp();
              const generatedopts = URLArranger.generateOptionalParamRoutes(
                arrangerGroup.string,
                "group",
                where,
              );
              generatedopts.forEach((grp) => {
                // apply the middlewares here
                // @ts-ignore //
                newAppGroup.route(grp, myNewGroup);
              });

              if (!hasDomain) {
                byEndpointsRouter.route("/", newAppGroup);
              } else if (isset(domain) && !empty(domain)) {
                this.applyMainMiddleware(
                  "",
                  Server.domainPattern[key][domainName] as HonoType,
                );
                Server.domainPattern[key][domainName].route(
                  routePrefix,
                  newAppGroup,
                );
              }
            }
          }
          // @ts-ignore //
          // if (Route.fallbackFn) {
          //   byEndpointsRouter.use(
          //     // @ts-ignore //
          //     toNotfound(
          //       {
          //         // @ts-ignore //
          //         args: Route.fallbackFn,
          //         // @ts-ignore //
          //         debugString: Route.fallbackFn.toString(),
          //       },
          //       []
          //     )
          //   );
          //   // @ts-ignore //
          //   Route.fallbackFn = null; // reset after applying
          // }
          this.app.route(routePrefix, byEndpointsRouter);
        }
      }
    }
  }

  private static endInit() {
    this.app.notFound(async function (c: MyContext) {
      return await myError(c);
    });

    const ServerDomainKeys = Object.keys(this.domainPattern); // ["web", "api"]
    ServerDomainKeys.forEach((key) => {
      const allApp = this.domainPattern[key];
      const allDomainKeys = Object.keys(allApp); // ["example.com", "api.example.com"]
      allDomainKeys.forEach((domainKey) => {
        const app = allApp[domainKey];
        app.notFound(async function (c: MyContext) {
          return await myError(c);
        });
      });
    });
  }
}

await Server.init();

globalFn(
  "route",
  function (routeName: string, params: Record<string, any> = {}) {
    if (!keyExist(Server.routes, routeName)) {
      throw new Error(`Route "${routeName}" not found`);
    }

    const { url, requiredParams, optionalParams } = Server.routes[routeName];

    // Ensure all required params are present
    requiredParams.forEach((param) => {
      if (!keyExist(params, param)) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    });

    let finalUrl = url;

    // Replace required params
    requiredParams.forEach((param) => {
      finalUrl = finalUrl.replace(
        `{${param}}`,
        encodeURIComponent(params[param]),
      );
    });

    // Replace optional params if provided, otherwise strip them
    optionalParams.forEach((param) => {
      if (keyExist(params, param)) {
        finalUrl = finalUrl.replace(
          `{${param}?}`,
          encodeURIComponent(params[param]),
        );
      } else {
        // remove segment with optional param cleanly
        finalUrl = finalUrl.replace(new RegExp(`/\\{${param}\\?\\}`), "");
      }
    });

    return finalUrl;
  },
);

export default Server;
