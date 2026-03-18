import HttpException from "./HttpException.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
export default class UnsupportedMediaTypeHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 415) {
        super(message, headers, httpCode);
        this.name = "UnsupportedMediaTypeHttpException";
    }
}   