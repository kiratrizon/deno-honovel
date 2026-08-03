import HttpException from "./HttpException.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
export default class UnprocessableEntityHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 422) {
        super(message, headers, httpCode);
        this.name = "UnprocessableEntityHttpException";
    }
}