import { Edge } from "edge.js";
import {
  ViewEngine,
  ViewParams,
} from "../../@hono-types/declaration/IHonoView.d.ts";

class HonoView {
  static #viewEngine: ViewEngine;
  #data: Record<string, unknown> = {};
  static #engine = "edge";
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
      `${viewName.split(".").join("/")}.edge`
    );
    if (!pathExist(templatePath)) {
      throw new Error(`View not found: ${viewName}`);
    }
    const rendered = await HonoView.#viewEngine.render(viewName.split(".").join("/"), this.#data);
    return rendered;
  }
  static init() {
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

  getView() {
    return {
      viewFile: this.#viewFile,
      data: this.#data,
    };
  }
}

export default HonoView;
