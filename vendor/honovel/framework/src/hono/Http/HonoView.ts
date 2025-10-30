import { Edge, edgeGlobals } from "edge.js";
import { ViewParams } from "../../../../@types/declaration/IHonoView.d.ts";
import { TagContract } from "edge.js/types";
import prettier from "prettier";
// Import Edge.js for Deno
// import { Edge as TestEdge } from "https://deno.land/x/edge/src/edge.ts";
// import { edgePlugin } from "https://deno.land/x/edge@3.2.1/plugins/mod.ts";

class HonoView {
  #data: Record<string, unknown> = {};
  #viewFile = "";
  private edge = new Edge({
    cache: false,
  });
  constructor({ viewName = "", data, mergeData }: ViewParams = {}) {
    if (data && typeof data === "object") {
      for (const [key, value] of Object.entries(data)) {
        this.#data[`$${key}`] = value;
      }
    }
    if (mergeData && typeof mergeData === "object") {
      for (const [key, value] of Object.entries(mergeData)) {
        this.#data[key] = value;
      }
    }
    this.#viewFile = viewName;
    this.init();
  }

  async element() {
    const tempRendered = await this.renderElement(this.#viewFile, this.#data);

    if (env("DENO_DEPLOYMENT_ID")) {
      return tempRendered;
    } else {
      return await this.pretty(tempRendered);
    }
  }
  private init() {
    this.edge.mount(viewPath());
  }

  protected addGlobal(param: Record<string, unknown> = {}) {
    Object.entries(param).forEach(([key, value]) => {
      if (key === "$slots") {
        throw new Error("slot key is already reserved")
      }
      this.edge.global(key, value);
    });
  }

  protected addTags(tags: Array<TagContract> = []) {
    tags.forEach((tag) => {
      this.edge.registerTag(tag);
    });
  }

  private async renderElement(
    viewName: string,
    data: Record<string, unknown> = {}
  ) {
    const arrangeTemplate = viewName.split(".").join("/");

    if (isObject(data)) {
      this.addGlobal(data);
    }
    // Default path (child view)
    const rendered = await this.edge.render(arrangeTemplate);
    return rendered;
  }

  private async pretty(html: string) {
    try {
      return await prettier.format(html, { parser: "html" });
    } catch {
      // fallback if something breaks (invalid HTML)
      return html;
    }
  }
}

export default HonoView;
