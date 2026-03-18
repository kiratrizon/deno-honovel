import "./index.ts";

import HonoView from "HonoHttp/HonoView.ts";
import { DDError } from "../Maneuver/HonovelErrors.ts";
import HonoRedirect from "HonoHttp/HonoRedirect.ts";
import HonoResponseV2 from "HonoHttp/HonoResponse.ts";
import Event from "Illuminate/Events/index.ts";
import Exceptions from "Illuminate/Foundation/Execptions/Exceptions.ts";

globalFn("response", function (html = null, status = 200) {
  if (!isset(html)) {
    return new HonoResponseV2();
  } else if (isString(html)) {
    return new HonoResponseV2().status(status).html(html);
  }
});

globalFn(
  "view",
  (viewName: string, data: Record<string, unknown> = {}, mergeData = {}) => {
    return new HonoView({ viewName, data, mergeData });
  },
);

globalFn("dd", (...args: unknown[]) => {
  const returnValue = args.length === 1 ? args[0] : args;
  throw new DDError(returnValue ?? null);
});

globalFn("abort", (statusCode = 500, message = null) => {
  const exception = Exceptions.find(statusCode);
  if (isset(message)) {
    exception.message = message;
  }
  throw exception;
});

globalFn("redirect", (url = null) => {
  return new HonoRedirect(url);
});

globalFn("event", async (event: string | object, payload: any[] = []) => {
  return await Event.dispatch(event, payload);
});
