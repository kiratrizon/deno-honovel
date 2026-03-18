import HttpException from "./HttpException.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
export default class PreconditionFailedHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 412) {
        super(message, headers, httpCode);
        this.name = "PreconditionFailedHttpException";
    }
}