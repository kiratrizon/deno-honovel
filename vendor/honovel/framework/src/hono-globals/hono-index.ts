import "./index.ts";

import HonoResponse from "../hono/Http/HonoResponse.ts";
import HonoView from "../hono/Http/HonoView.ts";

globalFn("response", function (html = null) {
  const HResponse = new HonoResponse(html);
  return HResponse;
});

globalFn(
  "view",
  (
    viewName: string,
    data: Record<string, unknown> = {},
    mergeData: Record<string, unknown> = {}
  ) => {
    return new HonoView({ viewName, data, mergeData });
  }
);
