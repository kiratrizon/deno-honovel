import HttpException from "./HttpException.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
export default class PreconditionRequiredHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 428) {
        super(message, headers, httpCode);
        this.name = "PreconditionRequiredHttpException";
    }   
}