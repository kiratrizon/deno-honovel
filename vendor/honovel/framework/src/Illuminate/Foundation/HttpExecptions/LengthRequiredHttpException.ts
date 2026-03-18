import HttpException from "./HttpException.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
export default class LengthRequiredHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 411) {
        super(message, headers, httpCode);
        this.name = "LengthRequiredHttpException";
    }
}