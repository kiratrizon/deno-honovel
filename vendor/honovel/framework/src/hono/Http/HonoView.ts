import ejs from "ejs";
import pug from "pug";
import { Edge } from "edge.js";
import {
  ViewEngine,
  ViewParams,
} from "../../@hono-types/declaration/IHonoView.d.ts";

class HonoView {
  static #viewEngine: ViewEngine;
  #data: Record<string, unknown> = {};
  static #engine = "ejs";
  #viewFile = "";
  constructor({ viewName = "", data, mergeData }: ViewParams = {}) {
    this.#data = {
      ...mergeData,
      ...data,
      ...this.#data,
    };
    this.#viewFile = viewName;
  }

  async element(viewName: string, data = {}) {
    this.#data = {
      ...data,
      ...this.#data,
    };

    const templatePath = viewPath(
      `${viewName.split(".").join("/")}.${HonoView.#engine}`
    );
    if (!pathExist(templatePath)) {
      const error = `View not found: ${templatePath}`;
      return error;
    }
    if (HonoView.#engine !== "edge") {
      const rawHtml = getFileContents(templatePath);
      const rendered = await HonoView.#viewEngine.render(rawHtml, this.#data);
      return rendered;
    } else {
      const rendered = await HonoView.#viewEngine.render(viewName, this.#data);
      return rendered;
    }
  }
  static init() {
    HonoView.#engine =
      (staticConfig("view.defaultViewEngine") as string) || "ejs";
    if (HonoView.#engine === "ejs") {
      HonoView.#viewEngine = ejs;
    }
    if (HonoView.#engine === "pug") {
      HonoView.#viewEngine = pug;
    }
    if (HonoView.#engine === "edge") {
      const edge = new Edge({
        cache: false,
      });

      edge.mount(viewPath());
      HonoView.#viewEngine = {
        render: async (template: string, data: Record<string, unknown>) => {
          return await edge.render(template, data);
        },
      };
    }
  }

  getView() {
    return {
      viewFile: this.#viewFile,
      data: this.#data,
    };
  }
}

export default HonoView;
