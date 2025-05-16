import "./index.ts";

import ExpressResponse from "../express-server/Http/ExpressResponse.ts";
import ExpressView from "../express-server/Http/ExpressView.ts";
globalFn("response", function (html = null) {
  const EResponse = new ExpressResponse(html);
  return EResponse;
});

globalFn(
  "view",
  (
    viewName: string,
    data: Record<string, unknown> = {},
    mergeData: Record<string, unknown> = {}
  ) => {
    const renderView = new ExpressView(viewName, data, mergeData);
    return renderView;
  }
);
