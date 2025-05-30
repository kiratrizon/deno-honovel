import { Context } from "hono";
import HonoClosure from "./HonoClosure.ts";
import HonoView from "./HonoView.ts";

class HonoDispatch {
  #type: "dispatch" | "middleware";
  #action: {
    [K in keyof Context]: Context[K] extends (...args: any[]) => any
      ? K
      : never;
  }[keyof Context] = "text";
  #forNext: boolean = false;

  #statusCode: number = 200;
  #myData: Exclude<unknown, null | undefined>[] = [];
  constructor(
    returnedData: Exclude<unknown, null | undefined>,
    type: "dispatch" | "middleware" = "dispatch"
  ) {
    this.#type = type;
    if (returnedData instanceof HonoClosure) {
      this.#forNext = !0;
    } else if (is_string(returnedData)) {
      this.#action = "text";
      this.#myData.push(returnedData);
      this.#statusCode = 200;
    } else if (is_object(returnedData)) {
      if (returnedData instanceof HonoView) {
        this.#action = "html";
        const getView = returnedData.getView();
        const myElement = returnedData.element(getView.viewFile, {});
        this.#myData.push(myElement);
        this.#statusCode = 200;
      }
    }
  }

  public get isNext() {
    return this.#forNext;
  }
  public get myData() {
    return this.#myData;
  }
  public get statusCode() {
    return this.#statusCode;
  }

  public get action() {
    return this.#action;
  }
}

export default HonoDispatch;
