export default class PayloadParser {
  public handle: HttpMiddleware = async ({ request }, next) => {
    const contentLengthHeader = request.header("Content-Length") || "0";
    const contentLength = Number(contentLengthHeader);

    if (!contentLengthHeader || isNaN(contentLength) || contentLength < 0) {
      abort(411, "Content-Length required and must be a valid positive number");
    }

    // If within limit, parse the body
    await request.buildRequest();

    return next();
  };
}
