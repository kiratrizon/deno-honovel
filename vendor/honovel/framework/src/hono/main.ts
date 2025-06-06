import "../hono-globals/hono-index.ts";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "hono/deno";
import fs from "node:fs";

import { Hono, MiddlewareHandler, Next } from "hono";
import Boot from "../Maneuver/Boot.ts";

import HonoView from "./Http/HonoView.ts";
import {
  Variables,
  HonoType,
  CorsConfig,
} from "../@hono-types/declaration/imain.d.ts";

import { Context } from "node:vm";
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

const myError = async (c: Context) => {
  if (c.req.header("accept")?.includes("application/json")) {
    return c.json(
      {
        message: "Not Found",
      },
      404
    );
  }

  // this is for html
  if (
    !pathExist(viewPath(`error/404.${staticConfig("view.defaultViewEngine")}`))
  ) {
    return c.html(getFileContents(honovelPath("hono/defaults/404.stub")), 404);
  }
  const html404 = new HonoView();
  const render = html404.element("error/404", {});
  return c.html(render, 404);
};

function domainGroup(
  mainstring: string,
  {
    string,
    sequenceParams,
    optionalParams,
    requiredParams,
  }: {
    string: string;
    sequenceParams: string[];
    optionalParams: string[];
    requiredParams: string[];
  }
): MiddlewareHandler {
  return async (c: Context, next) => {
    const protocol = (c.req.url.split("://")[0] || "http") + "://";
    const host = c.req.header("host")?.split(".");
    const subdomain = host.shift();

    const checker = (protocol + subdomain).startsWith(env("APP_URL"));

    const [keyOfSubdomain, extra] = string.replace("/:", "").split(".");
    console.log(keyOfSubdomain);
    if (!empty(requiredParams) && empty(optionalParams)) {
      if (checker) {
        console.warn(
          `Please check your ENV APP_URL configuration. It should contain the base URL with port if needed, like "http://localhost:2000" or "https://example.com".`
        );
        return await myError(c);
      } else {
        c.set("subdomain", { [keyOfSubdomain]: subdomain });
      }
    } else if (empty(requiredParams) && !empty(optionalParams)) {
      if (checker) {
        c.set("subdomain", { [keyOfSubdomain]: null });
      } else {
        c.set("subdomain", { [keyOfSubdomain]: subdomain });
      }
    } else if (empty(requiredParams) && empty(optionalParams)) {
      if (subdomain.toLowerCase() !== keyOfSubdomain.toLowerCase()) {
        return await myError(c);
      }
    }
    await next();
  };
}

class Server {
  private static Hono = Hono;
  public static app: HonoType;

  private routes: Record<string, unknown> = {};
  public static async init() {
    await Boot.init();

    this.app = this.generateNewApp();
    this.app.use("*", async (c, next) => {
      c.set("subdomain", {});
      await next();
    });
    this.app.use(serveStatic({ root: publicPath() }));
    this.app.use(serveStatic({ root: honovelPath("hono/hono-assets") }));

    // this.app.use(
    //   "*",
    //   secureHeaders({
    //     xFrameOptions: false,
    //     xXssProtection: false,
    //   })
    // );
    await this.loadAndValidateRoutes();
    this.endInit();
  }

  private static generateNewApp(): HonoType {
    return new this.Hono<{ Variables: Variables }>();
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
        const { groups, methods, defaultRoute } =
          instancedRoute.getAllGroupsAndMethods();
        if (isset(methods) && !empty(methods)) {
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
                arrangerDispatch.string
              );
              const returnedDispatch = toDispatch(
                myConfig.callback as IMyConfig["callback"],
                arrangerDispatch.sequenceParams
              );
              newApp.on(
                methodarr.map((m) => m.toUpperCase()),
                splittedUri,
                buildRequestInit(),
                regexToHono(flagWhere, arrangerDispatch.sequenceParams),
                ...toMiddleware(flagMiddleware),
                returnedDispatch as MiddlewareHandler
              );
              byEndpointsRouter.route("/", newApp);
            }
            this.app.route(routePrefix, byEndpointsRouter);
          }

          // for groups
          if (isset(groups) && !empty(groups) && is_object(groups)) {
            const groupKeys = Object.keys(groups);
            for (const groupKey of groupKeys) {
              const myNewGroup = this.generateNewApp(); // Create a new Hono instance for the group

              const myGroup = groups[groupKey];
              const {
                as = "",
                domain = null,
                where = {},
                middleware = [],
                name = "",
              } = myGroup.flagConfig;

              middleware.unshift(key);

              const domainParam: string[] = [];
              if (isset(domain) && !empty(domain)) {
                const domainArranger = URLArranger.urlCombiner(domain, false);
                myNewGroup.use("*", domainGroup(domain, domainArranger));
                domainParam.push(...domainArranger.sequenceParams);
              }
              let newName = "";
              if (!empty(name)) {
                newName = (name.replace(/\*\d+\*/g, "") || "/").replace(
                  /\/+/g,
                  "/"
                );
              }
              const groupEntries = Object.entries(myGroup.myRoutes);
              const arrangerGroup = URLArranger.urlCombiner(newName);
              groupEntries.forEach(([routeId, methodarr]) => {
                const routeUsed = methods[routeId];
                const myConfig = routeUsed.config;
                const flag = routeUsed.myFlag;

                const combinedGroupDispatch = URLArranger.urlCombiner([
                  newName,
                  myConfig.uri,
                ]);
                domainParam.push(...combinedGroupDispatch.sequenceParams);
                const returnedDispatch = toDispatch(
                  myConfig.callback as IMyConfig["callback"],
                  domainParam
                );

                const arrangerDispatch = URLArranger.urlCombiner(myConfig.uri);
                const newMethodUri = arrangerDispatch.string;
                const newGroupMiddleware: MiddlewareHandler[] = [];
                if (isset(where) && !empty(where)) {
                  newGroupMiddleware.unshift(
                    regexToHono(where, [...domainParam])
                  );
                }
                newGroupMiddleware.push(...toMiddleware(middleware));
                const splittedUri =
                  URLArranger.generateOptionalParamRoutes(newMethodUri);

                const flagWhere = flag.where || {};
                const flagName = flag.name || "";
                const flagMiddleware = flag.middleware || [];
                newGroupMiddleware.push(
                  regexToHono(flagWhere, [...domainParam]),
                  ...toMiddleware(flagMiddleware)
                );
                myNewGroup.on(
                  methodarr.map((m) => m.toUpperCase()),
                  splittedUri,
                  buildRequestInit(),
                  ...newGroupMiddleware,
                  returnedDispatch as MiddlewareHandler
                );
              });
              const newAppGroup = this.generateNewApp();
              URLArranger.generateOptionalParamRoutes(
                arrangerGroup.string,
                "group"
              ).forEach((grp) => {
                // apply the middlewares here
                newAppGroup.route(grp, myNewGroup);
              });
              byEndpointsRouter.route("/", newAppGroup);
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
