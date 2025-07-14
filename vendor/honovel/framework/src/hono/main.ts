import "../hono-globals/hono-index.ts";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
// import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "hono/deno";
import fs from "node:fs";
import * as path from "https://deno.land/std/path/mod.ts";

import { Hono, MiddlewareHandler, Next } from "hono";
import Boot from "../Maneuver/Boot.ts";

import { HonoType } from "../../../@types/declaration/imain.d.ts";

import { INRoute } from "../../../@types/declaration/IRoute.d.ts";
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
import { default as Router } from "Illuminate/Support/Facades/Route";
const Route = Router as typeof INRoute;
const headFunction: MiddlewareHandler = async (c: MyContext, next) => {
  const { request } = c.get("myHono");
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
  return async (c: MyContext, next) => {
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
const myStaticDefaults: MiddlewareHandler[] = [
  serveStatic({ root: path.relative(Deno.cwd(), publicPath()) }),
  serveStatic({
    root: path.relative(Deno.cwd(), honovelPath("hono/hono-assets")),
  }),
];

// domain on beta test
const _forDomain: MiddlewareHandler = async (c, next: Next) => {
  const requestUrl = new URL(c.req.url);
  const appUrl = env("APP_URL", "").toLowerCase();
  const [protocol, domain] = requestUrl.toString().toLowerCase().split("://");
  const [incoming, uri] = domain.split("/");
  let incomingUrl: string;
  if (isset(env("DENO_DEPLOYMENT_ID"))) {
    incomingUrl = `${protocol}://${incoming.replace(
      `-${env("DENO_DEPLOYMENT_ID", "")}`,
      ""
    )}`;
  } else {
    incomingUrl = `${protocol}://${incoming}`;
  }
  incomingUrl = [incomingUrl, uri || ""].join("/");
  let key: string = "web";
  if (c.req.raw.url.startsWith("/api/")) {
    key = "api";
  }
  if (!incomingUrl.startsWith(appUrl)) {
    const host = c.req.raw.url.split("://")[1].split("/")[0];

    if (keyExist(Server.domainPattern[key], host)) {
      return await Server.domainPattern[key][host].fetch(c.req.raw);
    }
    // Check for patterns with wildcards
    for (const pattern in Server.domainPattern[key]) {
      if (pattern.includes("*")) {
        const regex = new RegExp(
          "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, "[^.]+") + "$"
        );

        if (regex.test(host)) {
          return await Server.domainPattern[key][pattern].fetch(c.req.raw);
        }
      }
    }
    return await myError(c);
  }

  await next();
};

class Server {
  private static Hono = Hono;
  public static app: HonoType;
  public static domainPattern: Record<string, Record<string, HonoType>> = {};

  private routes: Record<string, unknown> = {};
  public static async init() {
    await Boot.init();
    this.app = this.generateNewApp({}, true);
    if (isset(env("PHPMYADMIN_HOST"))) {
      this.app.get("/myadmin", async (c) => {
        return c.redirect("/myadmin/", 301);
      });
      this.app.all("/myadmin/*", async (c) => {
        const targetUrl = `${env("PHPMYADMIN_HOST")}${c.req.path.replace(
          "/myadmin",
          ""
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

  private static generateNewApp(
    config?: Record<string, unknown>,
    withDefaults: boolean = false
  ): HonoType {
    let app: HonoType;
    if (isset(config) && !empty(config)) {
      app = new this.Hono(config);
    } else {
      app = new this.Hono();
    }
    const defaultUrls = ["favicon.ico", "robots.txt"];

    defaultUrls.forEach((url) => {
      app.get(`/${url}`, async (c) => {
        const checkFile = publicPath(url);

        if (pathExist(checkFile)) {
          const fileContent = await Deno.readFile(checkFile);
          const contentType = url.endsWith(".ico")
            ? "image/x-icon"
            : "text/plain";
          return new Response(fileContent, {
            status: 200,
            headers: {
              "Content-Type": contentType,
            },
          });
        }

        // If file doesn't exist → send empty 204 (like Laravel returning no favicon)
        return new Response(null, { status: 204 });
      });
    });

    if (withDefaults) {
      app.use(...myStaticDefaults);
      app.use("*", async (c, next) => {
        c.set("subdomain", {});
        await next();
      });
    }
    return app;
  }

  private static applyMainMiddleware(key: string, app: HonoType) {
    const mainMiddleware = [key];
    const buildMainMiddleware = [...toMiddleware(mainMiddleware)];
    if (key === "web") {
      app.use("*", async (c, next: Next) => {
        c.set("from_web", true);
        await next();
      });
    }
    this.useCors(key, app);
    const parsePayload = async (c: MyContext, next: Next) => {
      const { request } = c.get("myHono");
      // @ts-ignore //
      await request.buildRequest();
      return await next();
    };
    app.use(
      "*",
      honoSession(),
      buildRequestInit(),
      parsePayload,
      ...buildMainMiddleware
    );
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
      if (isset(Route)) {
        Server.domainPattern[key] = {};
        const byEndpointsRouter = this.generateNewApp();
        this.applyMainMiddleware(key, byEndpointsRouter);
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
              const arrangerDispatch = URLArranger.urlCombiner(myConfig.uri);
              const newApp = this.generateNewApp();

              const splittedUri = URLArranger.generateOptionalParamRoutes(
                arrangerDispatch.string,
                "dispatch",
                flagWhere
              );
              const returnedDispatch = toDispatch(
                {
                  args: myConfig.callback as IMyConfig["callback"],
                  debugString: myConfig.debugString,
                },
                arrangerDispatch.sequenceParams
              );
              const allBuilds = [
                ...toMiddleware([...flagMiddleware]),
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
                Server.domainPattern[key][domainName] = this.generateNewApp(
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
                  {
                    args: myConfig.callback as IMyConfig["callback"],
                    debugString: myConfig.debugString,
                  },
                  myParam
                );
                // console.log(myParam);
                const arrangerDispatch = URLArranger.urlCombiner(myConfig.uri);
                const newMethodUri = arrangerDispatch.string;

                const newGroupMiddleware: MiddlewareHandler[] = [
                  ...groupMiddleware,
                ];

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

              const myGroupMiddleware = [...toMiddleware(middleware)];
              generatedopts.forEach((grp) => {
                // apply the middlewares here
                newAppGroup.use("*", ...myGroupMiddleware);
                newAppGroup.route(grp, myNewGroup);
              });

              if (!hasDomain) {
                byEndpointsRouter.route("/", newAppGroup);
              } else if (isset(domain) && !empty(domain)) {
                this.applyMainMiddleware(
                  key,
                  Server.domainPattern[key][domainName]
                );
                Server.domainPattern[key][domainName].route(
                  routePrefix,
                  newAppGroup
                );
              }
            }
          }
          this.app.get(`${routePrefix}/__warmup`, async (c) => {
            return c.text("");
          });
          this.app.route(routePrefix, byEndpointsRouter);
        }
      }
    }
  }

  private static useCors(key: string, router: HonoType) {
    const corsConfig = staticConfig("cors") || {};
    const corsPaths = corsConfig.paths || [];

    corsPaths.forEach((cpath) => {
      if (cpath.startsWith(key + "/")) {
        router.use(
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
  }

  private static endInit() {
    this.app.use("*", async function (c) {
      return await myError(c);
    });

    const ServerDomainKeys = Object.keys(this.domainPattern); // ["web", "api"]
    ServerDomainKeys.forEach((key) => {
      const allApp = this.domainPattern[key];
      const allDomainKeys = Object.keys(allApp); // ["example.com", "api.example.com"]
      allDomainKeys.forEach((domainKey) => {
        const app = allApp[domainKey];
        app.use("*", async function (c) {
          return await myError(c);
        });
      });
    });
  }
}

await Server.init();

export default Server;
