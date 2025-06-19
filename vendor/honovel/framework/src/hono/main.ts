import "../hono-globals/hono-index.ts";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "hono/deno";
import fs from "node:fs";

import { Hono, MiddlewareHandler, Next } from "hono";
import Boot from "../Maneuver/Boot.ts";

import {
  Variables,
  HonoType,
  CorsConfig,
} from "../@hono-types/declaration/imain.d.ts";

import { Context } from "hono";
import { INRoute } from "../@hono-types/declaration/IRoute.d.ts";
import {
  buildRequestInit,
  regexToHono,
  toDispatch,
  toMiddleware,
  URLArranger,
} from "./Support/FunctionRoute.ts";
import { IMyConfig } from "./Support/MethodRoute.ts";
import { honoSession } from "./Http/HonoSession.ts";
import { myError } from "./Http/builder.ts";

const headFunction: MiddlewareHandler = async (c, next) => {
  const { request } = c.get("HttpHono") as HttpHono;
  if (!request.isMethod("HEAD")) {
    return await myError(c);
  }
  await next();
};
function domainGroup(
  mainstring: string,
  {
    sequenceParams,
  }: {
    sequenceParams: string[];
  }
): MiddlewareHandler {
  return async (c: Context, next) => {
    const workingParams = [...sequenceParams];
    const host = c.req.raw.url.split("://")[1].split("/")[0];
    const domainParts = host.split(".");
    const domainPattern = mainstring.split(".");
    const domainParams: Record<string, string> = {};
    if (!empty(sequenceParams)) {
      domainPattern.forEach((part, index) => {
        if (part === "*" && sequenceParams.length > 0) {
          const key = workingParams.shift();
          const value = domainParts[index];
          if (isset(key) && isset(value)) {
            domainParams[key] = value;
          }
        }
      });
    }
    c.set("subdomain", domainParams);
    await next();
  };
}

function convertLaravelDomainToWildcard(domain: string): string {
  return domain.replace(/\{[^.}]+\}/g, "*");
}
import * as path from "https://deno.land/std/path/mod.ts";
const myStaticDefaults: MiddlewareHandler[] = [
  serveStatic({ root: path.relative(Deno.cwd(), publicPath()) }),
  serveStatic({
    root: path.relative(Deno.cwd(), honovelPath("hono/hono-assets")),
  }),
];

class Server {
  private static Hono = Hono;
  public static app: HonoType;
  public static domainPattern: Record<string, HonoType> = {};

  private routes: Record<string, unknown> = {};
  public static async init() {
    await Boot.init();
    this.app = this.generateNewApp({}, true);

    this.app.use("*", async (c, next: Next) => {
      const requestUrl = new URL(c.req.url);
      const appUrl = env("APP_URL", "").toLowerCase();
      const incomingUrl = requestUrl.toString().toLowerCase();

      if (!incomingUrl.startsWith(appUrl)) {
        const host = c.req.raw.url.split("://")[1].split("/")[0];

        if (keyExist(Server.domainPattern, host)) {
          return await Server.domainPattern[host].fetch(c.req.raw);
        }
        // Check for patterns with wildcards
        for (const pattern in Server.domainPattern) {
          if (pattern.includes("*")) {
            const regex = new RegExp(
              "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, "[^.]+") + "$"
            );

            if (regex.test(host)) {
              return await Server.domainPattern[pattern].fetch(c.req.raw);
            }
          }
        }
        return await myError(c);
      }

      await next();
    });
    await this.loadAndValidateRoutes();
    this.endInit();
  }

  private static generateNewApp(
    config?: Record<string, unknown>,
    withDefaults: boolean = false
  ): HonoType {
    let app: HonoType;
    if (isset(config) && !empty(config)) {
      app = new this.Hono<{ Variables: Variables }>(config);
    } else {
      app = new this.Hono<{ Variables: Variables }>();
    }

    if (withDefaults) {
      app.use(...myStaticDefaults);
      app.use("*", async (c, next) => {
        c.set("subdomain", {});
        await next();
      });
    }
    return app;
  }

  private static async loadAndValidateRoutes() {
    const routePath = basePath("routes");
    const routeFiles = fs
      .readdirSync(routePath)
      .filter((file) => file.endsWith(".ts"));
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
      const routePrefix = key === "web" ? "" : key;
      let route: typeof INRoute | undefined = undefined;

      try {
        if (file === "web.ts") {
          const module = await import("../../../../../routes/web.ts");
          route = module.default as typeof INRoute;
        } else if (file === "api.ts") {
          const module = await import("../../../../../routes/api.ts");
          route = module.default as typeof INRoute;
        }
      } catch (err) {
        console.warn(`Route file "${file}" could not be loaded.`, err);
      }
      if (isset(route)) {
        const byEndpointsRouter = this.generateNewApp();
        if (file === "web.ts") {
          byEndpointsRouter.use("*", async (c, next: Next) => {
            c.set("from_web", true);
            await next();
          });
        }
        byEndpointsRouter.use("*", honoSession());
        const corsConfig = (staticConfig("cors") as CorsConfig) || {};
        const corsPaths = corsConfig.paths || [];
        corsPaths.forEach((cpath) => {
          if (cpath.startsWith(key + "/")) {
            byEndpointsRouter.use(
              cpath.replace(key, ""),
              cors({
                origin: corsConfig.allowed_origins || "*",
                allowMethods: corsConfig.allowed_methods || [
                  "GET",
                  "POST",
                  "PUT",
                  "DELETE",
                ],
                allowHeaders: corsConfig.allowed_headers || ["*"],
                exposeHeaders: corsConfig.exposed_headers || [],
                maxAge: corsConfig.max_age || 3600,
                credentials: corsConfig.supports_credentials || false,
              })
            );
          }
        });
        const instancedRoute = new route();
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
              const arrangerDispatch = URLArranger.urlCombiner(myConfig.uri);
              const newApp = this.generateNewApp();

              const splittedUri = URLArranger.generateOptionalParamRoutes(
                arrangerDispatch.string,
                "dispatch",
                flagWhere
              );
              const returnedDispatch = toDispatch(
                myConfig.callback as IMyConfig["callback"],
                arrangerDispatch.sequenceParams
              );
              const allBuilds = [
                buildRequestInit(),
                ...toMiddleware(flagMiddleware),
                returnedDispatch as MiddlewareHandler,
              ];
              if (methodarr.length === 1 && arrayFirst(methodarr) === "head") {
                allBuilds.splice(1, 0, headFunction);
                splittedUri.forEach((str) => {
                  newApp.get(str, ...allBuilds);
                });
              } else {
                newApp.on(
                  methodarr.map((m) => m.toUpperCase()),
                  splittedUri,
                  ...allBuilds
                );
              }
              byEndpointsRouter.route("/", newApp);
            }
            this.app.route(routePrefix, byEndpointsRouter);
          }

          // for groups
          if (isset(groups) && !empty(groups) && isObject(groups)) {
            const groupKeys = Object.keys(groups);
            for (const groupKey of groupKeys) {
              let hasDomain = false;
              let domainName = "";
              const myNewGroup = this.generateNewApp();

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

              middleware.unshift(key);

              const domainParam: string[] = [];
              const groupMiddleware: MiddlewareHandler[] = [];

              if (isset(domain) && !empty(domain)) {
                domainName = convertLaravelDomainToWildcard(domain);

                const domainArranger = URLArranger.urlCombiner(
                  domain.split("."),
                  false
                );
                domainArranger.string = domainArranger.string
                  .slice(1)
                  .split("/")
                  .join(".");
                myNewGroup.use("*", domainGroup(domainName, domainArranger));
                domainParam.push(...domainArranger.sequenceParams);
                hasDomain = true;
                Server.domainPattern[domainName] = this.generateNewApp(
                  {},
                  true
                );
                groupMiddleware.push(regexToHono(where, domainParam));
              }
              let newName = "";
              if (!empty(name)) {
                newName = (name.replace(/\*\d+\*/g, "") || "/").replace(
                  /\/+/g,
                  "/"
                );
              }

              const groupEntries = Object.entries(myGroup.myRoutes);
              const arrangerGroup = URLArranger.urlCombiner(newName, true);
              groupEntries.forEach(([routeId, methodarr]) => {
                const routeUsed = methods[routeId];
                const myConfig = routeUsed.config;
                const flag = routeUsed.myFlag;
                const myParam: string[] = [...domainParam];
                const combinedGroupDispatch = URLArranger.urlCombiner([
                  newName,
                  myConfig.uri,
                ]);
                myParam.push(...combinedGroupDispatch.sequenceParams);
                const returnedDispatch = toDispatch(
                  myConfig.callback as IMyConfig["callback"],
                  myParam
                );
                // console.log(myParam);
                const arrangerDispatch = URLArranger.urlCombiner(myConfig.uri);
                const newMethodUri = arrangerDispatch.string;

                const newGroupMiddleware: MiddlewareHandler[] = [
                  ...groupMiddleware,
                ];

                newGroupMiddleware.push(...toMiddleware(middleware));
                const flagWhere = flag.where || {};
                const splittedUri = URLArranger.generateOptionalParamRoutes(
                  newMethodUri,
                  "dispatch",
                  flagWhere
                );
                const flagName = flag.name || "";
                const flagMiddleware = flag.middleware || [];
                newGroupMiddleware.push(...toMiddleware(flagMiddleware));
                const allBuilds = [
                  buildRequestInit(),
                  ...newGroupMiddleware,
                  returnedDispatch as MiddlewareHandler,
                ];

                if (
                  methodarr.length === 1 &&
                  arrayFirst(methodarr) === "head"
                ) {
                  allBuilds.splice(1, 0, headFunction);
                  splittedUri.forEach((str) => {
                    myNewGroup.get(str, ...allBuilds);
                  });
                } else {
                  myNewGroup.on(
                    methodarr.map((m) => m.toUpperCase()),
                    splittedUri,
                    ...allBuilds
                  );
                }
              });
              const newAppGroup = this.generateNewApp();
              const generatedopts = URLArranger.generateOptionalParamRoutes(
                arrangerGroup.string,
                "group",
                where
              );

              generatedopts.forEach((grp) => {
                // apply the middlewares here
                newAppGroup.route(grp, myNewGroup);
              });

              if (!hasDomain) {
                byEndpointsRouter.route("/", newAppGroup);
              } else if (isset(domain) && !empty(domain)) {
                if (file === "web.ts") {
                  Server.domainPattern[domainName].use(
                    "*",
                    async (c, next: Next) => {
                      c.set("from_web", true);
                      await next();
                    }
                  );
                }
                Server.domainPattern[domainName].use("*", honoSession());
                corsPaths.forEach((cpath) => {
                  if (cpath.startsWith(key + "/")) {
                    Server.domainPattern[domainName].use(
                      cpath.replace(key, ""),
                      cors({
                        origin: corsConfig.allowed_origins || "*",
                        allowMethods: corsConfig.allowed_methods || [
                          "GET",
                          "POST",
                          "PUT",
                          "DELETE",
                        ],
                        allowHeaders: corsConfig.allowed_headers || ["*"],
                        exposeHeaders: corsConfig.exposed_headers || [],
                        maxAge: corsConfig.max_age || 3600,
                        credentials: corsConfig.supports_credentials || false,
                      })
                    );
                  }
                });
                Server.domainPattern[domainName].route(
                  routePrefix,
                  newAppGroup
                );
                Server.domainPattern[domainName].use("*", async function (c) {
                  return await myError(c);
                });
              }
            }
            this.app.route(routePrefix, byEndpointsRouter);
          }
        }
      }
    }
  }

  private static endInit() {
    this.app.use("*", async function (c) {
      return await myError(c);
    });
  }
}

await Server.init();

export default Server;
