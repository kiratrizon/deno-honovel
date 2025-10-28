import HonoClosure from "./HonoClosure.ts";
import { HonoResponse } from "HonoHttp/HonoResponse.ts";
import { handleAction } from "../Support/FunctionRoute.ts";

class HonoDispatch {
  #type: "dispatch" | "middleware";
  #forNext: boolean = false;

  #returnedData: unknown;
  constructor(
    returnedData: Exclude<unknown, null | undefined>,
    type: "dispatch" | "middleware" = "dispatch"
  ) {
    this.#type = type;
    this.#returnedData = returnedData;
    if (
      this.#returnedData instanceof HonoClosure &&
      this.#type === "middleware"
    ) {
      this.#forNext = true;
    }
  }
  public async build(c: MyContext) {
    const request = c.get("myHono").request;
    if (
      request.isMethod("HEAD") &&
      isObject(this.#returnedData) &&
      !(this.#returnedData instanceof HonoResponse)
    ) {
      throw new Error("HEAD method cannot return a response.");
    }
    return await handleAction(this.#returnedData, c);
  }

  public get isNext(): boolean {
    return this.#forNext;
  }
}

export default HonoDispatch;
