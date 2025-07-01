import { Hono } from "hono";
import { HonoSession } from "../../framework/src/hono/Http/HonoSession.ts";
import { ISession } from "./ISession.d.ts";

type SessionDataTypes = {
  id: string;
};

// for Context
export type Variables = {
  myHono: IMyHono;
  HonoSession: HonoSession;
  from_web: boolean;
  subdomain: Record<string, string | null>;
  session: ISession
};

export type HonoTypeImport = {
  Variables: Variables;
}
export type HonoType = Hono<HonoTypeImport>;
