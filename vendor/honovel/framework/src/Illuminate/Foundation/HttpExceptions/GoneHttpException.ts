import HttpException from "./HttpException.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
export default class GoneHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 410) {
        super(message, headers, httpCode);
        this.name = "GoneHttpException";
    }
}