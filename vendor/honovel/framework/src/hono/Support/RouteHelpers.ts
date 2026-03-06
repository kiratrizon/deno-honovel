/**
 * Extracted helper utilities for route processing
 * Reduces code duplication and improves maintainability
 */

import { MiddlewareHandler } from "hono";
import { HonoType } from "../../../../@types/declaration/imain.d.ts";

/**
 * Convert Laravel-style domain patterns to wildcard format
 * @example convertLaravelDomainToWildcard("{sub}.example.com") => "*.example.com"
 */
export function convertLaravelDomainToWildcard(domain: string): string {
  return domain.replace(/\{[^.}]+\}/g, "*");
}

/**
 * Create domain group middleware for subdomain matching
 */
export function domainGroup(
  mainstring: string,
  { sequenceParams }: { sequenceParams: string[] },
): MiddlewareHandler {
  const domainPattern = mainstring.split(".");

  return async (c: MyContext, next: () => Promise<void>) => {
    const workingParams = [...sequenceParams];
    const host = c.req.raw.url.split("://")[1].split("/")[0];
    const domainParts = host.split(".");
    const domainParams: Record<string, string> = {};

    if (workingParams.length > 0) {
      domainPattern.forEach((part, index) => {
        if (part === "*" && workingParams.length > 0) {
          const key = workingParams.shift();
          const value = domainParts[index];
          if (isset(key) && isset(value)) {
            domainParams[key] = value;
          }
        }
      });
    }

    c.set("subdomain", domainParams);
    return await next();
  };
}

/**
 * Check if domain matches pattern (supports wildcards)
 */
export function matchesDomainPattern(pattern: string, host: string): boolean {
  if (!pattern.includes("*")) {
    return pattern === host;
  }

  const regex = new RegExp(
    "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, "[^.]+") + "$",
  );
  return regex.test(host);
}

/**
 * Extract domain host from URL
 */
export function extractHost(url: string): string {
  return url.split("://")[1].split("/")[0];
}

/**
 * Build middleware array for route/group
 */
export interface MiddlewareBuildOptions {
  globalMiddleware: MiddlewareHandler[];
  routeGroupMiddleware: MiddlewareHandler[];
  flagMiddleware: MiddlewareHandler[];
  dispatch: MiddlewareHandler;
  fallbacks: MiddlewareHandler[];
}

export function buildMiddlewareChain(
  options: MiddlewareBuildOptions,
): MiddlewareHandler[] {
  return [...options.flagMiddleware, options.dispatch, ...options.fallbacks];
}

/**
 * Validate route name uniqueness
 */
export function validateRouteName(
  routes: Record<string, any>,
  name: string,
  warn = true,
): boolean {
  if (keyExist(routes, name)) {
    if (warn) {
      console.warn(
        `Route name "${name}" already exists. Overriding it is not allowed.`,
      );
    }
    return false;
  }
  return true;
}

/**
 * Register route with name
 */
export function registerRoute(
  routes: Record<string, any>,
  name: string,
  url: string,
  requiredParams: string[],
  optionalParams: string[],
): void {
  routes[name] = {
    url,
    requiredParams,
    optionalParams,
  };
}

/**
 * Build final route URL with prefix
 */
export function buildRouteUrl(prefix: string, uri: string): string {
  return `${prefix === "/" ? "" : prefix}${uri}`;
}

/**
 * Cache for middleware instances to avoid repeated instantiation
 */
const middlewareCache = new Map<string, any>();

export function getCachedMiddleware<T>(key: string, factory: () => T): T {
  if (!middlewareCache.has(key)) {
    middlewareCache.set(key, factory());
  }
  return middlewareCache.get(key)!;
}

/**
 * Clear middleware cache (useful for testing)
 */
export function clearMiddlewareCache(): void {
  middlewareCache.clear();
}
