import HonoResponse from "./HonoResponse.ts";

export default class StreamResponse extends HonoResponse {
  constructor(
    stream: ReadableStream<Uint8Array>,
    contentType = "application/octet-stream",
    headers?: Headers,
    status = 200,
  ) {
    super(
      stream,
      contentType,
      headers ?? new Headers({ "Content-Type": contentType }),
      status,
    );
  }
}
