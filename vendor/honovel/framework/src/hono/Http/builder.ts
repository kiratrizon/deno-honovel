import type { Context } from "hono";
import type {
  RequestData,
  RequestMethod,
  SERVER,
} from "../../@hono-types/declaration/IHonoRequest.d.ts";
import { getSignedCookie } from "hono/cookie";
import HonoView from "./HonoView.ts";
import { getAppKey } from "./HonoSession.ts";

export async function buildRequest(c: Context): Promise<RequestData> {
  const toStr = (val: string | string[] | undefined): string =>
    Array.isArray(val) ? val.join(", ") : (val || "unknown").toString();

  const req = c.req;
  const url = new URL(req.url);

  const forServer: SERVER = {
    SERVER_NAME: c.req.header("host")?.split(":")[0] || "unknown",
    SERVER_ADDR: "unknown", // Not available directly
    SERVER_PORT: c.req.header("host")?.split(":")[1] || "unknown", // Not available directly
    SERVER_PROTOCOL: url.protocol.replace(":", "") || "http",
    REQUEST_METHOD: c.req.method,
    QUERY_STRING: url.searchParams.toString() || "",
    REQUEST_URI: url.pathname + url.search,
    DOCUMENT_ROOT: basePath?.() || "unknown",
    HTTP_USER_AGENT: toStr(c.req.header("user-agent")),
    HTTP_REFERER: toStr(c.req.header("referer")),
    REMOTE_ADDR:
      c.req.header("x-forwarded-for")?.split(",")[0].trim() || "unknown",
    REMOTE_PORT: "unknown", // Not available
    SCRIPT_NAME: url.pathname,
    HTTPS: url.protocol === "https:" ? "on" : "off",
    HTTP_X_FORWARDED_PROTO: toStr(c.req.header("x-forwarded-proto")),
    HTTP_X_FORWARDED_FOR: toStr(c.req.header("x-forwarded-for")),
    REQUEST_TIME: date("Y-m-d H:i:s"), // your global function
    REQUEST_TIME_FLOAT: Date.now(),
    GATEWAY_INTERFACE: "CGI/1.1",
    SERVER_SIGNATURE: "X-Powered-By: Throy Tower",
    PATH_INFO: url.pathname,
    HTTP_ACCEPT: toStr(c.req.header("accept")),
    HTTP_X_REQUEST_ID: toStr(
      c.req.header("x-request-id") || generateRequestId()
    ),
  };

  const methodType = c.req.method.toUpperCase() as RequestMethod;
  const contentType = (c.req.header("content-type") || "").toLowerCase();

  const files: Record<string, File[]> = {};
  let body: Record<string, unknown> = {};

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.raw.formData();
    for (const [key, val] of formData.entries()) {
      if (val instanceof File) {
        files[key] = [val];
      } else if (isArray(val) && val.every((v) => v instanceof File)) {
        files[key] = val;
      } else {
        body[key] = val;
      }
    }
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await c.req.text();
    const params = new URLSearchParams(text);
    params.forEach((value, key) => {
      if (body[key]) {
        if (isArray(body[key])) {
          (body[key] as string[]).push(value);
        } else {
          body[key] = [body[key] as string, value];
        }
      } else {
        body[key] = value;
      }
    });
  } else if (contentType.includes("application/json")) {
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
  } else if (contentType.includes("text/plain")) {
    const text = await c.req.text();
    body = { text };
  } else if (contentType.includes("application/octet-stream")) {
    const buffer = await c.req.arrayBuffer();
    body = { buffer }; // you can handle it differently depending on use case
  } else {
    // fallback for unknown or missing content type
    const text = await c.req.text();
    body = { text };
  }

  const xForwardedFor = c.req.raw.headers.get("x-forwarded-for");
  const xRealIp = c.req.raw.headers.get("x-real-ip");
  const protoHeader = c.req.url.split(":")[0];

  const method = methodType;
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  const query = c.req.query() || {};
  const rawQuery = c.req.url.split("?")[1] || "";
  const cookies = (await getSignedCookie(c, getAppKey())) || {};
  if (keyExist(cookies, "sid")) {
    // Remove session ID from cookies if it exists
    delete cookies.sid;
  }
  const cookieHeader = c.req.header("cookie") || "";
  const path = c.req.path;
  const originalUrl = c.req.url;
  const ip = xForwardedFor
    ? xForwardedFor.split(",")[0].trim()
    : xRealIp || "unknown";
  const protocol = protoHeader;
  const userAgent = c.req.header("user-agent") || "";
  const timestamp = time();

  const REQUEST: RequestData = {
    method,
    headers,
    body,
    query,
    rawQuery,
    cookies,
    cookieHeader,
    path,
    originalUrl,
    ip,
    protocol,
    userAgent,
    timestamp,
    files,
    server: forServer,
    params: { ...c.get("subdomain"), ...(c.req.param() || {}) },
  };
  return REQUEST;
}
function generateRequestId() {
  return crypto.randomUUID?.() || "req-" + Math.random().toString(36).slice(2);
}

export async function myError(c: Context) {
  if (c.req.header("accept")?.includes("application/json")) {
    return c.json(
      {
        message: "Not Found",
      },
      404
    );
  }

  // this is for html
  if (!pathExist(viewPath(`error/404.edge`))) {
    return c.html(getFileContents(honovelPath("hono/defaults/404.stub")), 404);
  }
  const html404 = new HonoView();
  const render = await html404.element("error/404", {});
  return c.html(render, 404);
}
