import { ContentfulStatusCode } from "hono/utils/http-status";
import HttpException from "./HttpException.ts";

export default class BadRequestHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 400) {
        super(message, headers, httpCode);
        this.name = "BadRequestHttpException";
    }
}