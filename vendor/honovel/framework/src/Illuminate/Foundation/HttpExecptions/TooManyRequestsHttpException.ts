import HttpException from "./HttpException.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
export default class TooManyRequestsHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 429) {
        super(message, headers, httpCode);
        this.name = "TooManyRequestsHttpException";
    }
}