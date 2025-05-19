import "../hono-globals/hono-index.ts";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { sessionMiddleware, MemoryStore } from "hono-sessions";
import { createClient } from "redis";
import { getCookie, setCookie } from "hono/cookie";
import { serveStatic } from "hono/deno";

import { Hono } from "hono";
import Boot from "../Maneuver/Boot.ts";

import HonoView from "./Http/HonoView.ts";

class Server {
  private static Hono: typeof Hono = Hono;
  public static app: InstanceType<typeof Hono> = new Server.Hono();

  public static async init() {
    await Boot.init();
    this.app.use("*", logger());
    this.app.use(serveStatic({ root: publicPath() }));

    this.app.use(
      "*",
      cors({
        origin: staticConfig("origins.origins") || "*",
        allowMethods: ["GET", "POST", "PUT", "DELETE"],
        allowHeaders: ["Content-Type", "Authorization", "Accept"],
      })
    );
    this.app.get("/", async (c) => {
      const html = new HonoView();
      const render = html.element("welcome", {});
      return c.html(render);
    });
    // this.app.use(
    //   "*",
    //   secureHeaders({
    //     xFrameOptions: false,
    //     xXssProtection: false,
    //   })
    // );

    await this.endInit();
  }

  private static endInit() {
    this.app.use("*", async (c) => {
      // for something that accepts a json response
      console.log(c.req.header("accept"));
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
