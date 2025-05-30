import ejs from "ejs";
import pug from "pug";
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

  element(viewName: string, data = {}) {
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
    const rawHtml = getFileContents(templatePath);
    const rendered = HonoView.#viewEngine.render(rawHtml, this.#data);
    return rendered;
  }
  static init() {
    HonoView.#engine = staticConfig("view.defaultViewEngine") || "ejs";
    if (HonoView.#engine === "ejs") {
      HonoView.#viewEngine = ejs;
    }
    if (HonoView.#engine === "pug") {
      HonoView.#viewEngine = pug;
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
