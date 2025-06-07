import { Hono } from "hono";
import { HonoSession } from "../../hono/Http/HonoSession.ts";

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

export interface CorsConfig {
  paths?: string[];
  allowed_methods?: string[];
  allowed_origins: string[] | null;
  allowed_origins_patterns?: string[];
  allowed_headers?: string[];
  exposed_headers?: string[];
  max_age?: number;
  supports_credentials?: boolean;
}

interface ChannelBase {
  driver: string;
}

interface SingleChannel extends ChannelBase {
  driver: "single";
  path: string;
}

interface DailyChannel extends ChannelBase {
  driver: "daily";
  path: string;
  days: number;
}

interface StackChannel extends ChannelBase {
  driver: "stack";
  channels: string[];
}

interface StderrChannel extends ChannelBase {
  driver: "stderr";
}

interface ConsoleChannel extends ChannelBase {
  driver: "console";
}

type Channel =
  | SingleChannel
  | DailyChannel
  | StackChannel
  | StderrChannel
  | ConsoleChannel;

type Channels = Record<string, Channel>;

interface LogConfig {
  default: string;
  channels: Channels;
}

export interface LogConfig {
  default: string;
  channels: Channels;
}
