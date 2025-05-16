import ejs from "npm:ejs";
import pug from "npm:pug";

type viewEngine = ejs | pug;
interface ViewParams {
  viewName?: string;
  data?: Record<string, unknown>;
  mergeData?: Record<string, unknown>;
}
class ExpressView {
  static #viewEngine: viewEngine;
  #data: Record<string, unknown> = {};
  static #engine = staticConfig("view.defaultViewEngine") || "ejs";
  rendered = "";
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
      `${viewName.split(".").join("/")}.${ExpressView.#engine}`
    );
    if (!pathExist(templatePath)) {
      const error = `View not found: ${templatePath}`;
      this.rendered = error;
      return error;
    }
    const rawHtml = getFileContents(templatePath);
    const rendered = ExpressView.#viewEngine.render(rawHtml, this.#data);
    this.rendered = rendered;
    return rendered;
  }
  static {
    if (ExpressView.#engine === "ejs") {
      ExpressView.#viewEngine = ejs;
    }
    if (ExpressView.#engine === "pug") {
      ExpressView.#viewEngine = pug;
    }
  }

  getView() {
    return {
      viewFile: this.#viewFile,
      data: this.#data,
    };
  }
}

export default ExpressView;
