import Exception from "./Exception.ts";
import IHttpHono from "../../../../../@types/declaration/HttpHono.d.ts";
import { HonoResponse } from "HonoHttp/HonoResponse.ts";
import HttpException from "../HttpExecptions/HttpException.ts";
import Application, { ExceptionConstructor } from "../Application.ts";
import IHonoView from "../../../../../@types/declaration/IHonoView.d.ts";
export type IExceptionCallback<T extends ExceptionConstructor = ExceptionConstructor> = (httpObj: IHttpHono, exception: InstanceType<T>) => Promise<HonoResponse | IHonoView | string | null | undefined | number | boolean | Record<string, any> | Array<any>>;

import AccessDeniedHttpException from "../HttpExecptions/AccessDeniedHttpException.ts";
import BadRequestHttpException from "../HttpExecptions/BadRequestHttpException.ts";
import ConflictHttpException from "../HttpExecptions/ConflictHttpException.ts";
import GoneHttpException from "../HttpExecptions/GoneHttpException.ts";
import LengthRequiredHttpException from "../HttpExecptions/LengthRequiredHttpException.ts";
import LockedHttpException from "../HttpExecptions/LockedHttpException.ts";
import NotAcceptableHttpException from "../HttpExecptions/NotAcceptableHttpException.ts";
import NotFoundHttpException from "../HttpExecptions/NotFoundHttpException.ts";
import PreconditionFailedHttpException from "../HttpExecptions/PreconditionFailedHttpException.ts";
import PreconditionRequiredHttpException from "../HttpExecptions/PreconditionRequiredHttpException.ts";
import ServiceUnavailableHttpException from "../HttpExecptions/ServiceUnavailableHttpException.ts";
import TooManyRequestsHttpException from "../HttpExecptions/TooManyRequestsHttpException.ts";
import UnprocessableEntityHttpException from "../HttpExecptions/UnprocessableEntityHttpException.ts";
import UnsupportedMediaTypeHttpException from "../HttpExecptions/UnsupportedMediaTypeHttpException.ts";
import { ContentfulStatusCode } from "hono/utils/http-status";
export default class Exceptions {

    public static render<T extends ExceptionConstructor = ExceptionConstructor>(exception: ExceptionConstructor, cb: IExceptionCallback<T>) {
        // @ts-ignore //
        Application.addException(exception, cb);
    }

    public static find(httpCode: ContentfulStatusCode): HttpException {
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
            503: ServiceUnavailableHttpException,
            406: NotAcceptableHttpException,
        }
        if (keyExist(allExceptions, httpCode)) {
            return new allExceptions[httpCode]();
        }
        return new HttpException();
    }
}