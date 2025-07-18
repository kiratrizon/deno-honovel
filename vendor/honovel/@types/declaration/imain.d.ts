import { Hono } from "hono";
import {
  HonoSession,
  Session,
} from "../../framework/src/hono/Http/HonoSession.ts";
import HttpHono from "HttpHono";
import HonoClosure from "../../framework/src/hono/Http/HonoClosure.ts";

type SessionDataTypes = {
  id: string;
};

// for Context
export type Variables = {
  myHono: HttpHono;
  HonoSession: HonoSession;
  from_web: boolean;
  subdomain: Record<string, string | null>;
  session: Session;
  logged_out: boolean;
  honoClosure: HonoClosure;
};

export type HonoTypeImport = {
  Variables: Variables;
};
export type HonoType = Hono<HonoTypeImport>;
