import HonoResponse from "./HonoResponse.ts";

export default class RedirectResponse extends HonoResponse {
  constructor(url: string, status = 302) {
    super(null, null, new Headers({ Location: url }), status);
  }
}
