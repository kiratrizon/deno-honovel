import { Builder } from "Illuminate/Database/Eloquent/index.ts";
import { SupportedDrivers } from "configs/@types/index.d.ts";
import { sqlstring } from "Illuminate/Database/Query/index.ts";

export type PHPTimestampFormat =
  | "Y-m-d H:i:s"
  | "Y-m-d\\TH:i:sP"
  | "Y-m-d\\TH:i:sO";

export type AccessorMap<T extends Record<string, unknown>> = {
  [K in keyof T]?: (value: T[K]) => unknown;
};

export type FieldsPopulate<T extends Record<string, any>> = Array<keyof T>;

export type ModelAttributes = Record<string, unknown>;

export type CastType = "string" | "int" | "boolean" | "array" | "object";
