import "./index.ts";

import ExpressResponse from "../express-server/Http/ExpressResponse.ts";
globalFn("response", function (html = null) {
  const EResponse = new ExpressResponse(html);
  return EResponse;
});
