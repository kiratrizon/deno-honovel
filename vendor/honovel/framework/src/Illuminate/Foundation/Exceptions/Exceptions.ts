import Exception from "./Exception.ts";
import IHttpHono from "../../../../../@types/declaration/HttpHono.d.ts";
import { HonoResponse } from "HonoHttp/HonoResponse.ts";
import HttpException from "../HttpExceptions/HttpException.ts";
import Application, { ExceptionConstructor } from "../Application.ts";
import IHonoView from "../../../../../@types/declaration/IHonoView.d.ts";
export type IExceptionCallback<T extends ExceptionConstructor = ExceptionConstructor> = (httpObj: IHttpHono, exception: InstanceType<T>) => Promise<HonoResponse | IHonoView | string | null | undefined | number | boolean | Record<string, any> | Array<any>>;

import AccessDeniedHttpException from "../HttpExceptions/AccessDeniedHttpException.ts";
import BadRequestHttpException from "../HttpExceptions/BadRequestHttpException.ts";
import ConflictHttpException from "../HttpExceptions/ConflictHttpException.ts";
import GoneHttpException from "../HttpExceptions/GoneHttpException.ts";
import InternalServerErrorHttpException from "../HttpExceptions/InternalServerErrorHttpException.ts";
import LengthRequiredHttpException from "../HttpExceptions/LengthRequiredHttpException.ts";
import LockedHttpException from "../HttpExceptions/LockedHttpException.ts";
import NotAcceptableHttpException from "../HttpExceptions/NotAcceptableHttpException.ts";
import NotFoundHttpException from "../HttpExceptions/NotFoundHttpException.ts";
import PreconditionFailedHttpException from "../HttpExceptions/PreconditionFailedHttpException.ts";
import PreconditionRequiredHttpException from "../HttpExceptions/PreconditionRequiredHttpException.ts";
import ServiceUnavailableHttpException from "../HttpExceptions/ServiceUnavailableHttpException.ts";
import TooManyRequestsHttpException from "../HttpExceptions/TooManyRequestsHttpException.ts";
import UnprocessableEntityHttpException from "../HttpExceptions/UnprocessableEntityHttpException.ts";
import UnsupportedMediaTypeHttpException from "../HttpExceptions/UnsupportedMediaTypeHttpException.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
import AuthenticationException from "./AuthenticationException.ts";
export default class Exceptions {

    public static render<T extends ExceptionConstructor = ExceptionConstructor>(exception: T, cb: IExceptionCallback<T>) {
        // @ts-ignore //
        Application.addException(exception, cb);
    }

    public static find(httpCode: ContentfulStatusCode, message?: string, headers: Record<string, string> = {}): HttpException {
        const allExceptions = {
            400: BadRequestHttpException,
            403: AccessDeniedHttpException,
            404: NotFoundHttpException,
            409: ConflictHttpException,
            410: GoneHttpException,
            411: LengthRequiredHttpException,
            412: PreconditionFailedHttpException,
            415: UnsupportedMediaTypeHttpException,
            422: UnprocessableEntityHttpException,
            423: LockedHttpException,
            428: PreconditionRequiredHttpException,
            429: TooManyRequestsHttpException,
            500: InternalServerErrorHttpException,
            503: ServiceUnavailableHttpException,
            406: NotAcceptableHttpException,
            401: AuthenticationException,
        }
        if (keyExist(allExceptions, httpCode)) {
            return new allExceptions[httpCode](message, headers, httpCode);
        }
        return new HttpException(message, headers, httpCode);
    }
}