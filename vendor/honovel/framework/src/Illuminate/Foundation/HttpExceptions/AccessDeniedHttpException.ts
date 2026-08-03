import { ContentfulStatusCode } from "hono/utils/http-status";
import HttpException from "./HttpException.ts";

export default class AccessDeniedHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 403) {
        super(message, headers, httpCode);
        this.name = "AccessDeniedHttpException";
    }
}