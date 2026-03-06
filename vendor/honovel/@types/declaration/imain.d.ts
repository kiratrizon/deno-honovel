import { Hono } from "hono";
import HttpHono from "HttpHono";
import HonoClosure from "HonoHttp/HonoClosure.ts";
import { Session } from "Illuminate/Session/index.ts";
import { ImportSession } from "../../../../environment.ts";
import { Authenticatable } from "Illuminate/Contracts/Auth/index.ts";
import HonoHeader from "HonoHttp/HonoHeader.ts";
import HonoFile from "HonoHttp/HonoFile.ts";
import { SessionModifier } from "HonoHttp/HonoSession.ts";
import { SERVER } from "HonoHttp/HonoRequest.d.ts";
import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { ModelAttributes } from "Base/IBaseModel.d.ts";

type ErrorAndData = {
  error: Record<string, unknown>;
  data: Record<string, unknown>;
};
export type SessionDataTypes = {
  [key: string]: any;
} & {
  _token: string;
  _flash: {
    old: Array<string>;
    new: Array<string>;
  };
} & ImportSession;
// for Context
export type Variables = {
  myHono: HttpHono;
  subdomain: Record<string, string | null>;
  session: Session<SessionDataTypes>;
  logged_out: boolean;
  honoClosure: HonoClosure;
  auth_user: Authenticatable | null;
  fromHandle: number;
  response: Response | null;
  stopMiddleware: boolean;
  // HonoRequest context storage
  _calibrated: boolean;
  _files: Record<string, HonoFile[]>;
  _myAll: Record<string, unknown>;
  _myHeader: HonoHeader;
  _routeParams: Record<string, string | null>;
  _built: boolean;
  _sessionMod: SessionModifier;
  _bindedModels: Record<string, typeof Model<ModelAttributes>>;
  _server: SERVER;
  _variables: Record<string, unknown>;
};

export type HonoTypeImport = {
  Variables: Variables;
};
export type HonoType = Hono<HonoTypeImport>;
