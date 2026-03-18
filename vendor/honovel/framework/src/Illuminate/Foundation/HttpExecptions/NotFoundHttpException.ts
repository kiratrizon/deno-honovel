import { ContentfulStatusCode } from "hono/utils/http-status";
import HttpException from "./HttpException.ts";

export default class NotFoundHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 404) {
        super(message, headers, httpCode);
        this.name = "NotFoundHttpException";
    }
}