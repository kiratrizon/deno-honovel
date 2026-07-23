import "../hono-globals/hono-index.ts";
import { logger } from "hono/logger";
// import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "hono/deno";
import * as path from "node:path";

import { Hono, MiddlewareHandler } from "hono";
import Boot from "../Maneuver/Boot.ts";

import { HonoType } from "../../../@types/declaration/imain.d.ts";

import { INRoute } from "../../../@types/declaration/IRoute.d.ts";

import { methodOverride } from "hono/method-override";
import {
  buildRequestInit,
  regexToHono,
  TFallbackMiddleware,
  toDispatch,
  toMiddleware,
  URLArranger,
  toFallback,
  toNotfound,
  returnResponse,
  exceptionToResponse,
} from "./Support/FunctionRoute.ts";
import type HttpHono from "HttpHono";
import { IMyConfig } from "./Support/MethodRoute.ts";
import { honoSession } from "HonoHttp/HonoSession.ts";
import { Route as Router } from "Illuminate/Support/Facades/index.ts";
const Route = Router as typeof INRoute;

const warmUpdispatch: HttpDispatch = async () => {
  return response("");
};

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

/** Max wait when the dev server is down (Windows TCP + fetch can hang for many seconds). */
const VITE_PROBE_MS = 250;

// Check if something is listening on the Vite port (TCP probe — faster than HTTP; capped timeout)
const isViteRunning = async (port: number): Promise<boolean> => {
  try {
    const conn = await Deno.connect({
      hostname: "127.0.0.1",
      port,
      signal: AbortSignal.timeout(VITE_PROBE_MS),
    });
    conn.close();
    return true;
  } catch {
    return false;
  }
};

if (config("app").env === "local") {
  let viteServer: boolean = false;
  // vite local versioning
  // this will be the last version of the framework that will support vite local development for deno 2.7.5 and below
  if (
    versionCompare(frameworkVersion().honovelVersion, "2.0.1", ">") &&
    versionCompare(frameworkVersion().denoVersion, "2.7.5", ">") &&
    versionCompare(frameworkVersion().denoVersion, "2.7.11", "<")
  ) {
    console.warn(
      "⚡ Vite server is not supported for this version of the framework",
      frameworkVersion(),
    );
  } else {
    viteServer = await isViteRunning(vitePort);
    define("viteServer", viteServer, false);
    if (viteServer) {
      // check a json file if exist
      if (!pathExists(basePath("storage/framework/cache/vite.json"))) {
        makeDir(path.dirname(basePath("storage/framework/cache/vite.json")));
        writeFile(
          basePath("storage/framework/cache/vite.json"),
          jsonEncode({
            files: [],
          }),
        );
      }
    }
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
import NotFoundHttpException from "Illuminate/Foundation/HttpExecptions/NotFoundHttpException.ts";
import { RedirectResponse } from "HonoHttp/HonoResponse.ts";

const myStaticDefaults: MiddlewareHandler[] = [
  serveStatic({ root: path.relative(Deno.cwd(), publicPath()) }),
  serveStatic({
    root: path.relative(Deno.cwd(), honovelPath("hono/hono-assets")),
  }),
];

const globalMiddleware: MiddlewareHandler[] = [];
const globalMiddlewareFallback: TFallbackMiddleware[] = [];

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

import { DetectorOptions, languageDetector } from "hono/language";
import { RouterLoader } from "Illuminate/Foundation/Application.ts";

const i18n = {
  order: ["path", "querystring", "cookie", "header"],
  lookupQueryString: "lang",
  lookupCookie: "language",
  lookupFromHeaderKey: "accept-language",
  lookupFromPathIndex: 0,
  caches: ["cookie"],
  ignoreCase: true,
  fallbackLanguage: "en",
  supportedLanguages: config("app.supported_locales", ["en"]),
  cookieOptions: {
    sameSite: "Strict",
    secure: true,
    maxAge: 365 * 24 * 60 * 60,
    httpOnly: true,
  },
  debug: false,
} as DetectorOptions;

class Server {
  private static Hono = Hono;
  public static app: HonoType;
  public static domainPattern: Record<string, Record<string, HonoType>> = {};

  private static console: RouterLoader;

  private static routeFallbacks: Record<
    string,
    ((param: HttpHono) => Promise<void>) | null
  > = {};
  public static routes: Record<
    string,
    {
      url: string;
      requiredParams: string[];
      optionalParams: string[];
    }
  > = {};
  public static async init() {
    try {
      define(
        "application",
        (await import("../../../../../bootstrap/app.ts"))?.default,
        false,
      );
      const appRouter = application?.getRouter();
      const appRouterMiddleware = appRouter?.middleware;
      const [globalInstance, globalFallbackInstance] = [
        ...toMiddleware(appRouterMiddleware.global),
      ];
      // push
      globalMiddleware.push(...globalInstance);
      globalMiddlewareFallback.push(...globalFallbackInstance);
    } catch (_e) {
      console.error("Application not found", _e);
      if (
        !isset(env("DENO_DEPLOYMENT_ID")) ||
        empty(env("DENO_DEPLOYMENT_ID"))
      ) {
        Deno.exit(1);
      }
    }
    await Boot.init();
    this.app = await this.generateNewApp({}, true);
    const conditionalLogger = async (c: any, next: () => Promise<void>) => {
      const url = c.req.url;
      // skip if path ends with __warmup
      const skipPaths = ["/.well-known", "/robots.txt", "/favicon.ico"];
      if (skipPaths.some((path) => new URL(url).pathname.startsWith(path))) {
        return await next(); // skip logging
      }
      if (!url.endsWith("__warmup")) {
        return await logger()(c, next); // call logger middleware
      } else {
        return await next(); // skip logger
      }
    };

    this.app.use(conditionalLogger);

    if (!env("DENO_DEPLOYMENT_ID", null)) {
      const disks = config("filesystems")?.disks || {};

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

    // phpmyadmin logic
    // put PHPMYADMIN_HOST in env in order to embed phpmyadmin in the app
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

        headers.set("Host", new URL(targetUrl).host);
        headers.set("X-Forwarded-Host", c.req.header("host") ?? "");
        headers.set(
          "X-Forwarded-Proto",
          isFile(storagePath("ssl/cert.pem")) ? "https" : "http",
        );
        headers.set("X-Forwarded-Port", String(env("APP_PORT")));

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
          redirect: "manual",
        });

        const responseHeaders = new Headers(response.headers);

        // Remove problematic headers
        responseHeaders.delete("content-encoding");
        responseHeaders.delete("content-length");

        // Rewrite redirects to stay under /myadmin
        const location = responseHeaders.get("location");
        if (location) {
          const url = new URL(location, env("PHPMYADMIN_HOST") as string);

          responseHeaders.set(
            "location",
            `/myadmin${url.pathname}${url.search}${url.hash}`,
          );
        }

        const responseBody = await response.arrayBuffer();

        return new Response(responseBody, {
          status: response.status,
          headers: responseHeaders,
        });
      });
    }

    // initialize the app
    await this.loadAndValidateRoutes();
    await this.endInit();
  }

  private static async generateNewApp(
    conf?: Record<string, unknown>,
    withDefaults: boolean = false,
    key?: string,
  ): Promise<HonoType> {
    let app: HonoType;
    if (isset(conf) && !empty(conf)) {
      app = new this.Hono(conf);
    } else {
      app = new this.Hono();
    }

    const asterisk = "*";

    if (withDefaults) {
      app.use(asterisk, methodOverride({ app }));
      app.use(...myStaticDefaults);
      app.use(asterisk, async (c: MyContext, next: () => Promise<void>) => {
        c.set("subdomain", {});
        return await next();
      });
    }

    if (key === "web") {
      app.use(languageDetector(i18n));
    }

    return app;
  }

  private static applyMainMiddleware(
    key: string,
    app: HonoType,
  ): [string, TFallbackMiddleware[]] {
    const mainMiddleware = [];
    // @ts-ignore //
    const groupRoutes = GroupRoute.groupRouteMain as Record<
      string,
      { middleware: string[]; prefix?: string }
    >;
    if (isset(groupRoutes) && !empty(groupRoutes)) {
      if (isset(groupRoutes[key]) && keyExist(groupRoutes, key)) {
        mainMiddleware.push(...groupRoutes[key].middleware);
      }
    }

    const asterisk = "*";
    const [routeGroupMiddleware, routeGroupMiddlewareFallback]: [
      MiddlewareHandler[],
      TFallbackMiddleware[],
    ] = [...toMiddleware(mainMiddleware)];
    app.use(
      asterisk,
      honoSession(),
      buildRequestInit(),
      ...globalMiddleware,
      ...routeGroupMiddleware,
    );
    // return the prefix if exists
    const result: [string, TFallbackMiddleware[]] = [
      groupRoutes[key]?.prefix || "/",
      routeGroupMiddlewareFallback,
    ];
    return result;
  }

  private static async loadAndValidateRoutes() {
    const routePath = basePath("routes");
    const routeFiles: string[] = [];

    for await (const entry of Deno.readDir(routePath)) {
      if (entry.isFile && entry.name.endsWith(".ts")) {
        routeFiles.push(entry.name);
      }
    }
    // arrange the routes make the key web in first
    const routers = application.getRouter().routers;
    const ordered = {
      ...Object.fromEntries(
        Object.entries(routers).filter(([key]) => key !== "web"),
      ),
      ...(routers.web !== undefined && { web: routers.web }),
    };

    for (const [key, val] of Object.entries(ordered)) {
      if (key == "commands") {
        this.console = val;
        continue;
      }
      try {
        await val();
      } catch (err) {
        console.warn(`Route file "${key}" could not be loaded.`, err);
      }
      if (isset(Route)) {
        Server.domainPattern[key] = {};
        const byEndpointsRouter = await this.generateNewApp({}, false, key);
        const [routePrefix, routeGroupMiddlewareFallback] =
          this.applyMainMiddleware(key, byEndpointsRouter);
        const instancedRoute = new Route();
        const allGroup = instancedRoute.getAllGroupsAndMethods();

        const {
          groups,
          methods,
          defaultRoute,
          defaultResource,
          resourceReferrence,
          fallback,
        } = allGroup;
        if (isset(fallback)) {
          this.routeFallbacks[key] = fallback;
        }
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
                    methodarr,
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

          if (config("app.env") == "local") {
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
          }

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

              const hasOnlySlash: {
                found: boolean;
                method: string[];
                allBuilds: MiddlewareHandler[];
              } = {
                found: false,
                method: [],
                allBuilds: [],
              };
              const generatedopts = URLArranger.generateOptionalParamRoutes(
                arrangerGroup.string,
                "group",
                where,
              );

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
                let splittedUri = URLArranger.generateOptionalParamRoutes(
                  newMethodUri,
                  "dispatch",
                  flagWhere,
                );
                const flagName = flag.name || "";
                if (flagName !== "") {
                  const finalName = !empty(as) ? `${as}.${flagName}` : flagName;
                  const finalUrl = buildRouteUrl(
                    routePrefix,
                    `${newName}${myConfig.uri}`,
                  );

                  if (validateRouteName(this.routes, finalName)) {
                    registerRoute(
                      this.routes,
                      finalName,
                      finalUrl,
                      arrangerDispatch.requiredParams,
                      arrangerDispatch.optionalParams,
                      methodarr,
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

                // make sure splittedUri is not only "/" else splice
                splittedUri = splittedUri.filter((str) => {
                  if (str === "/" && !generatedopts.includes("/")) {
                    hasOnlySlash.found = true;
                  }
                  return true; // keep this element
                });

                if (hasOnlySlash.found) {
                  hasOnlySlash.method = methodarr;
                  hasOnlySlash.allBuilds = [...allBuilds];
                }
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

              if (hasOnlySlash.found) {
                generatedopts.forEach((grp) => {
                  if (
                    hasOnlySlash.method.length === 1 &&
                    hasOnlySlash.method[0] === "head"
                  ) {
                    hasOnlySlash.allBuilds.splice(1, 0, headFunction);
                    newAppGroup.get(
                      // @ts-ignore //
                      grp == "/" ? grp : `${grp}/`,
                      ...hasOnlySlash.allBuilds,
                    );
                  } else {
                    newAppGroup.on(
                      hasOnlySlash.method,
                      // @ts-ignore //
                      grp == "/" ? grp : `${grp}/`,
                      ...hasOnlySlash.allBuilds,
                    );
                  }
                });
              }
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
          this.app.route(routePrefix, byEndpointsRouter);
        } else {
          console.error("No routes found");
        }
      }
    }
  }

  private static async endInit() {
    if (!empty(this.routeFallbacks)) {
      // @ts-ignore //
      const groupRoutesMain = GroupRoute.groupRouteMain as Record<
        string,
        { middleware: string[]; prefix?: string }
      >;
      const fallbackEntries = Object.entries(this.routeFallbacks)
        .filter(([, fn]) => isset(fn))
        .map(([key, fn]) => ({
          prefix: groupRoutesMain[key]?.prefix || "/",
          fn: fn as (param: HttpHono) => Promise<void>,
        }))
        .sort((a, b) => b.prefix.length - a.prefix.length);

      this.app.notFound(async (c: MyContext) => {
        const path = c.req.path;
        const matched = fallbackEntries.find(
          ({ prefix }) =>
            prefix === "/" || path === prefix || path.startsWith(`${prefix}/`),
        );

        if (!matched) {
          const notFoundInstance = new NotFoundHttpException();
          return await exceptionToResponse(c, notFoundInstance);
        }
        const handler = toNotfound(
          {
            debugString: "Route::fallback",
            // @ts-ignore //
            args: matched.fn,
          },
          [],
        );
        return (await handler(c, async () => {})) as Response;
      });
    } else {
      this.app.notFound(async function (c: MyContext) {
        const notFoundInstance = new NotFoundHttpException();
        return await exceptionToResponse(c, notFoundInstance);
      });
    }

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

    // save routes in a file cache
    if (!isset(env("DENO_DEPLOYMENT_ID")) || empty(env("DENO_DEPLOYMENT_ID"))) {
      if (!pathExists(storagePath("framework/route"))) {
        makeDir(storagePath("framework/route"));
      }

      // arrange json file with pretty format
      const prettyRoutes = JSON.stringify(this.routes, null, 2);
      writeFile(
        path.join(storagePath("framework/route"), "routes.json"),
        prettyRoutes,
      );
    }

    if (isset(this.console) && isFunction(this.console)) {
      await this.console();
    }
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

    // $_GET build
    const allParams = [...requiredParams, ...optionalParams];
    let buildUrl = config("app.url") + finalUrl;
    const $_GET: string[] = [];
    Object.entries(params).forEach(([key, value]) => {
      if (!allParams.includes(key) && isset(value)) {
        $_GET.push(`${key}=${encodeURIComponent(value)}`);
      }
    });
    if ($_GET.length > 0) {
      buildUrl += `?${$_GET.join("&")}`;
    }
    return buildUrl;
  },
);

export default Server;
