import { Hono } from "hono";
import { HonoSession } from "../../framework/src/hono/Http/HonoSession.ts";

type SessionDataTypes = {
  id: string;
};

// for Context
export type Variables = {
  httpHono: HttpHono;
  session: HonoSession<SessionDataTypes>;
  from_web: boolean;
  subdomain: Record<string, string | null>;
};

export type HonoType = Hono<{
  Variables: Variables;
}>;
