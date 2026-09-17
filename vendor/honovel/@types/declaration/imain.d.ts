import { Hono } from "hono";
import HttpHono from "HttpHono";
import { ImportSession } from "../../../../environment.ts";
import { Authenticatable } from "Illuminate/Contracts/Auth/index.ts";
import HonoHeader from "HonoHttp/HonoHeader.ts";
import HonoFile from "HonoHttp/HonoFile.ts";
import { SessionStore } from "Illuminate/Session/Store.ts";
import { SERVER } from "HonoHttp/HonoRequest.d.ts";
import { ModelAttributes } from "./Base/IBaseModel.d.ts";
import Model from "Illuminate/Database/Eloquent/Model.ts";
import { AuthUser } from "Illuminate/Contracts/Auth/BaseGuard.ts";

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
  session: SessionStore;
  logged_out: boolean;
  auth_user: AuthUser | null;
  // HonoRequest context storage
  _calibrated: boolean;
  _files: Record<string, HonoFile[]>;
  _myAll: Record<string, unknown>;
  _myHeader: HonoHeader;
  _routeParams: Record<string, string | null>;
  _built: boolean;
  _bindedModels: Record<string, typeof Model<ModelAttributes>>;
  _server: SERVER;
  _variables: Record<string, unknown>;
  language: string;
  fallbackLanguage: string;
};

export type HonoTypeImport = {
  Variables: Variables;
};
export type HonoType = Hono<HonoTypeImport>;
