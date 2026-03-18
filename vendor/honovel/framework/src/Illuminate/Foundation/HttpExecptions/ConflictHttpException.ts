import { ContentfulStatusCode } from "hono/utils/http-status";
import HttpException from "./HttpException.ts";
export default class ConflictHttpException extends HttpException {
    constructor(message?: string, headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 409) {
        super(message, headers, httpCode);
        this.name = "ConflictHttpException";
    }
}