import HonoView from "./HonoView.ts";
import { ContentfulStatusCode } from "http-status";

export async function myError(
  c: MyContext,
  code: ContentfulStatusCode = 404,
  message: string = "Not Found"
) {
  const {request} = c.get("myHono");
  if (request.expectsJson() || request.ajax()) {
        return c.json(
      {
        message,
      },
      code
    );
  }

  // this is for html
  if (!(await pathExist(viewPath(`error/${code}.edge`)))) {
    const content = getFileContents(honovelPath("hono/defaults/abort.stub"));
    const finalContent = content
      .replace(/{{ code }}/g, code.toString())
      .replace(/{{ message }}/g, message);

    return c.html(finalContent, code);
  }
  const html404 = new HonoView({
    viewName: "error/404",
    data: {},
  });
  const render = await html404.element();
  return c.html(render, 404);
}
