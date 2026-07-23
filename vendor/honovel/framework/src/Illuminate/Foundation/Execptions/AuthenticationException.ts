import { ContentfulStatusCode } from "hono/utils/http-status";
import Exception from "./Exception.ts";

export default class AuthenticationException extends Exception {
    constructor(message: string = "Unauthenticated.", headers: Record<string, string> = {}, httpCode: ContentfulStatusCode = 401) {
        super(message, httpCode, headers);
        this.name = "AuthenticationException";
    }
}