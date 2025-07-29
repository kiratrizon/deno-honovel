import { Hono } from "hono";
import { HonoSession } from "../../framework/src/hono/Http/HonoSession.ts";
import HttpHono from "HttpHono";
import HonoClosure from "../../framework/src/hono/Http/HonoClosure.ts";
import { Session } from "Illuminate/Session/index.ts";
import { ImportSession } from "../../../../environment.ts";

type SessionDataTypes = {
  _token: string;
} & ImportSession;
// for Context
export type Variables = {
  myHono: HttpHono;
  HonoSession: HonoSession;
  from_web: boolean;
  subdomain: Record<string, string | null>;
  session: Session<SessionDataTypes>;
  logged_out: boolean;
  honoClosure: HonoClosure;
};

export type HonoTypeImport = {
  Variables: Variables;
};
export type HonoType = Hono<HonoTypeImport>;
