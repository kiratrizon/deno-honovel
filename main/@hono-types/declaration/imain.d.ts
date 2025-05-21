import { Hono } from "hono";

// for Context
export type Variables = {
  message: string;
  httpHono: HttpHono;
};

export type HonoType = Hono<{
  Variables: Variables;
}>;
