import { ContentfulStatusCode } from "hono/utils/http-status";
import Exception from "../Foundation/Execptions/Exception.ts";

export default class ValidationException extends Exception {
  constructor(
    message: string = "The given data was invalid.",
    headers: Record<string, string> = {},
    httpCode: ContentfulStatusCode = 422
  ) {
    super(message, httpCode, headers);
    this.name = "ValidationException";
  }

  public errors: Record<string, string[]> = {};
  public input: Record<string, any> = {};
}
