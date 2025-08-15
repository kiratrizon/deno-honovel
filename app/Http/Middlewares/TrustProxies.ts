import { IConfigure } from "../../../vendor/honovel/@types/declaration/MyImports.d.ts";
import HonoRequest from "HonoHttp/HonoRequest.ts";

export default class TrustProxies {
  // The list of trusted proxy IPs or networks (can be '*' to trust all)
  protected proxies: string[] = [];

  protected headers = HonoRequest.HEADER_X_FORWARDED_ALL;

  public handle: HttpMiddleware = async ({ request, Configure }, next) => {
    const remoteIp = request.ip();

    const headers = Configure.read(
      "trustedproxy.headers",
      this.headers
    ) as string[];
    if (this.isTrustedProxy(remoteIp, Configure)) {
      for (const header of headers) {
        const value = request.header(header);
        if (value) {
          request.headers.set(header, value);
        }
      }
    }

    return next();
  };

  protected isTrustedProxy(ip: string, Configure: typeof IConfigure): boolean {
    const proxies = Configure.read(
      "trustedproxy.proxies",
      this.proxies
    ) as string[];
    if (proxies.includes("*")) return true;
    return proxies.includes(ip);
  }
}
