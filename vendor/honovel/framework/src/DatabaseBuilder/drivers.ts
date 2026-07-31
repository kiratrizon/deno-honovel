export interface MssqlRequest {
  input(name: string, ...rest: unknown[]): MssqlRequest;
  query(sql: string): Promise<{
    // deno-lint-ignore no-explicit-any
    recordset: any[];
    rowsAffected: number[];
  }>;
}

export interface MssqlConnectionPool {
  request(): MssqlRequest;
  connect(): Promise<MssqlConnectionPool>;
  close(): Promise<void>;
}

// deno-lint-ignore no-explicit-any
let mysqlMod: any;
// deno-lint-ignore no-explicit-any
let mssqlMod: any;

type PgModule = typeof import("@db/pgsql");
let pgMod: PgModule | undefined;

// deno-lint-ignore no-explicit-any
export async function loadMysql(): Promise<any> {
  if (!mysqlMod) {
    const mod = await import("mysql2/promise");
    mysqlMod = mod.default ?? mod;
  }
  return mysqlMod;
}

// deno-lint-ignore no-explicit-any
export async function loadMssql(): Promise<any> {
  if (!mssqlMod) {
    const mod = await import("mssql");
    mssqlMod = mod.default ?? mod;
  }
  return mssqlMod;
}

export async function loadPgPool(): Promise<PgModule["Pool"]> {
  if (!pgMod) {
    pgMod = await import("@db/pgsql");
  }
  return pgMod.Pool;
}

const queryDriverLoaders: Record<string, () => Promise<{ default: unknown }>> =
  {
    mysql: () => import("./MySQL.ts"),
    pgsql: () => import("./PostgreSQL.ts"),
    sqlsrv: () => import("./MsSQL.ts"),
    sqlite: () => import("./SQlite.ts"),
  };

const queryDrivers: Record<string, unknown> = {};

/**
 * Resolve the query adapter for a driver, loading it on first use.
 *
 * Returns undefined for anything this build cannot serve, which callers surface
 * as "Unsupported database driver". sqlite is deliberately refused on Deno
 * Deploy: it needs a native module the platform cannot load, matching the
 * behaviour the previous eager driver map had by omitting it there.
 */
export async function loadQueryDriver(
  driver: string,
): Promise<unknown | undefined> {
  const key = driver.toLowerCase();

  if (key === "sqlite" && isset(env("DENO_DEPLOYMENT_ID"))) {
    return undefined;
  }

  if (!(key in queryDrivers)) {
    const loader = queryDriverLoaders[key];
    if (!loader) {
      return undefined;
    }
    queryDrivers[key] = (await loader()).default;
  }

  return queryDrivers[key];
}
