import { MiddlewareHandler } from "hono";
import { Session } from "Illuminate/Session/index.ts";

// Recursive type to exclude functions from any nested property
type NonFunction<T> = T extends (...args: any[]) => any
  ? never // exclude functions
  : T extends object
    ? { [K in keyof T]: NonFunction<T[K]> }
    : T;

export function honoSession(): MiddlewareHandler {
  return async (c: MyContext, next: () => Promise<void>) => {
    const value: Record<string, NonFunction<any>> = {};
    c.set("session", new Session(value));
    await next();
  };
}

export function sessionIdRecursive(): string {
  const timestamp = date("YmdHis");

  const array = crypto.getRandomValues(new Uint8Array(16));
  const randomPart = Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${timestamp}${randomPart}`;
}
