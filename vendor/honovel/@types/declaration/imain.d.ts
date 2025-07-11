import { Hono } from "hono";
import { HonoSession } from "../../framework/src/hono/Http/HonoSession.ts";
import { ISession } from "./ISession.d.ts";
import HttpHono from "HttpHono";

type SessionDataTypes = {
  id: string;
};

// for Context
export type Variables = {
  myHono: HttpHono;
  HonoSession: HonoSession;
  from_web: boolean;
  subdomain: Record<string, string | null>;
  session: ISession,
  logged_out: boolean;
};

export type HonoTypeImport = {
  Variables: Variables;
}
export type HonoType = Hono<HonoTypeImport>;
