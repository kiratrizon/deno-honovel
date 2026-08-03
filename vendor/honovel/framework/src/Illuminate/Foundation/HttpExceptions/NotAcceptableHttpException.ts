import HttpException from "./HttpException.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
export default class NotAcceptableHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 406) {
        super(message, headers, httpCode);
        this.name = "NotAcceptableHttpException";
    }
}   