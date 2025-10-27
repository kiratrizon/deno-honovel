import { Edge } from "edge.js";
import {
  ViewEngine,
  ViewParams,
} from "../../../../@types/declaration/IHonoView.d.ts";

class HonoView {
  #data: Record<string, unknown> = {};
  #viewFile = "";
  #parent = "";
  #viewEngine: ViewEngine = {} as ViewEngine;
  private edge = new Edge({
    cache: false,
  });
  static #default = "default.";
  constructor({ viewName = "", data, parent = "" }: ViewParams = {}) {
    this.#data = {
      ...data,
    };
    this.#viewFile = viewName;
    this.#parent = parent;
    this.init();
  }

  async element(data = {}) {
    this.#data = {
      ...this.#data,
      ...data,
    };
    const rendered = await this.renderElement(this.#viewFile, this.#data);
    if (!empty(this.#parent)) {
      const file = HonoView.#default + this.#parent;
      const slot = rendered;
      this.#data.slot = slot;
      return await this.renderElement(file, this.#data);
    }
    return rendered;
  }
  private init() {
    this.edge.mount(viewPath());
  }

  protected addGlobal(param: Record<string, unknown> = {}) {
    Object.entries(param).forEach(([key, value]) => {
      this.edge.global(key, value);
    });
  }

  private async renderElement(viewName: string, data = {}) {
    const templatePath = viewPath(`${viewName.split(".").join("/")}.edge`);
    if (!(await pathExist(templatePath))) {
      throw new Error(`View not found: ${viewName}`);
    }
    const rendered = await this.edge.render(viewName, data);
    return rendered;
  }
}

export default HonoView;
