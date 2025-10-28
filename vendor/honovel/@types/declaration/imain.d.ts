import { Hono } from "hono";
import HttpHono from "HttpHono";
import HonoClosure from "HonoHttp/HonoClosure.ts";
import { Session } from "Illuminate/Session/index.ts";
import { ImportSession } from "../../../../environment.ts";
import { Authenticatable } from "Illuminate/Contracts/Auth/index.ts";

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
};

export type HonoTypeImport = {
  Variables: Variables;
};
export type HonoType = Hono<HonoTypeImport>;
