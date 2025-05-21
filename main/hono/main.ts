import "../hono-globals/hono-index.ts";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { sessionMiddleware, MemoryStore } from "hono-sessions";
import { createClient } from "redis";
import { getCookie, setCookie } from "hono/cookie";
import { serveStatic } from "hono/deno";
import fs from "node:fs";

import { Hono } from "hono";
import Boot from "../Maneuver/Boot.ts";

import HonoView from "./Http/HonoView.ts";
import { Variables, HonoType } from "../@hono-types/declaration/imain.d.ts";
import { buildRequest } from "./Http/builder.ts";
import HonoRequest from "./Http/HonoRequest.ts";
import IHonoRequest from "../@hono-types/declaration/IHonoRequest.d.ts";
import { Context } from "node:vm";

function domainGroup(
  subdomainPattern: string,
  handler: (c: Context) => Promise<Response>
) {
  return async (c: Context) => {
    const host = c.req.header("host") || "";
    const subdomain = host.split(".")[0];

    if (subdomain === subdomainPattern || subdomainPattern === "*") {
      return await handler(c);
    } else {
      return c.text("Not Found", 404);
    }
  };
}

class Server {
  private static Hono = Hono;
  public static app: HonoType;

  private routes: Record<string, unknown> = {};
  public static async init() {
    await Boot.init();
    this.app = this.generateNewApp();
    this.app.use("*", logger());
    this.app.use(serveStatic({ root: publicPath() }));

    this.app.use(
      "*",
      cors({
        origin: staticConfig("origins.origins") || "*",
        allowMethods: ["GET", "POST", "PUT", "DELETE"],
        allowHeaders: ["Content-Type", "Authorization", "Accept"],
      }),
      async (c, next) => {
        const rawRequest = await buildRequest(c);
        // console.log(rawRequest);
        const request: IHonoRequest = new HonoRequest(rawRequest);
        c.set("httpHono", { request });
        await next();
      }
    );

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
    this.app.get(
      "/dashboard",
      domainGroup("foo", async (c) => {
        console.log(c.get("httpHono"));
        return c.text("Dashboard for foo tenant");
      })
    );
    const routePath = basePath("routes");
    const routeFiles = fs
      .readdirSync(routePath)
      .filter((file) => file.endsWith(".ts"));
    const webIndex = routeFiles.indexOf("web.ts");
    let webmjs = false;
    if (webIndex !== -1) {
      routeFiles.splice(webIndex, 1);
      webmjs = true;
    }
    if (webmjs) {
      // push it to the end of the array
      routeFiles.push("web.ts");
    }

    for (const file of routeFiles) {
      const key = file.replace(".ts", "");
      const routePrefix = key === "web" ? "" : `/${key}`;
      const filePath = `${routePath}/${file}`;
      const { default: route } = await import(filePath);
      // console.log(route);
    }
  }

  private static endInit() {
    this.app.use("*", async function (c) {
      // for something that accepts a json response
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
        !pathExist(
          viewPath(`error/404.${staticConfig("view.defaultViewEngine")}`)
        )
      ) {
        return c.html(
          getFileContents(basePath("main/hono/defaults/404.stub")),
          404
        );
      }
      const html404 = new HonoView();
      const render = html404.element("error/404", {});
      return c.html(render, 404);
    });
  }
}

await Server.init();

export default Server;
