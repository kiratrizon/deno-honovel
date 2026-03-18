import HttpException from "./HttpException.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
export default class ServiceUnavailableHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 503) {
        super(message, headers, httpCode);
        this.name = "ServiceUnavailableHttpException";
    }
}   