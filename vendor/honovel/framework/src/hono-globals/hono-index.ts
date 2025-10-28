import "./index.ts";

import HonoView from "HonoHttp/HonoView.ts";
import { AbortError, DDError } from "../Maneuver/HonovelErrors.ts";
import HonoRedirect from "HonoHttp/HonoRedirect.ts";
import HonoResponseV2 from "HonoHttp/HonoResponse.ts";

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
  }
);

globalFn("dd", (...args: unknown[]) => {
  const returnValue = args.length === 1 ? args[0] : args;
  throw new DDError(returnValue ?? null);
});

globalFn("abort", (statusCode = 500, message = null) => {
  throw new AbortError(statusCode, message);
});

globalFn("redirect", (url = null) => {
  return new HonoRedirect(url);
});
