// app.d.ts

interface AppMaintenanceConfig {
  /**
   * Maintenance Mode Driver (e.g., 'file', 'database')
   */
  driver: string;

  /**
   * Maintenance Store Name
   */
  store: string;
}
export interface AppConfig {
  /**
   * Application Name
   * Example: "Honovel"
   */
  name: string;

  /**
   * Application Environment
   * Example: "production", "development"
   */
  env: string;

  /**
   * Application Debug Mode
   * Enables or disables debug mode
   */
  debug: boolean;

  /**
   * Application URL
   * Example: "http://localhost:2000"
   */
  url: string;

  /**
   * Application Timezone
   * Example: "Asia/Tokyo"
   */
  timezone: string;

  /**
   * Application Locale
   * Example: "en"
   */
  locale: string;

  /**
   * Application Fallback Locale
   * Example: "en"
   */
  fallback_locale: string;

  /**
   * Faker Locale
   * Example: "en_US"
   */
  faker_locale: string;

  /**
   * Encryption Cipher
   * Example: "AES-256-CBC"
   */
  cipher:
    | "AES-128-CBC"
    | "AES-192-CBC"
    | "AES-256-CBC"
    | "AES-128-GCM"
    | "AES-256-GCM";

  /**
   * Encryption Key
   */
  key?: string;

  /**
   * Previous Encryption Keys
   */
  previous_keys: string[];

  /**
   * Maintenance Configuration
   */
  maintenance: AppMaintenanceConfig;
}

/**
 * A provider config structure (like 'users', 'admins').
 */
interface AuthProvider {
  driver: "eloquent";
  model: typeof Authenticatable;
  /**
   * This is the key used to check in database for the model.
   */
  credentialKey?: string;
  /**
   * This is the key used to check password in database for the model.
   */
  passwordKey?: string;
}

type AuthProviders = Record<string, AuthProvider>;

/**
 * A guard config structure (like 'jwt_user', 'session_admin').
 */
interface AuthGuard {
  driver: "jwt" | "session" | "token";
  provider: string; // Can keep `keyof AuthProviders` if you want strict linking
}

type AuthGuards = Record<string, AuthGuard>;

/**
 * The full auth config (like Laravel's config/auth.php).
 */
export interface AuthConfig {
  default: {
    guard: keyof AuthGuards;
  };
  guards: AuthGuards;
  providers: AuthProviders;
}

import { SslOptions } from "npm:mysql2@^2.3.3";
import { Authenticatable } from "Illuminate/Contracts/Auth/index.ts";

export type SupportedDrivers = "mysql" | "pgsql" | "sqlite" | "sqlsrv";

interface MySQLConnectionOptions {
  maxConnection: number;
}

interface MySQLReadWriteConfig {
  read?: MySQLConnectionConfigRaw;
  write?: MySQLConnectionConfigRaw;
  sticky?: boolean;
}

export interface MySQLConnectionConfigRaw {
  port?: number;
  user?: string;
  host?: string | string[];
  password?: string;
  database?: string;
  charset?: string;
  timezone?: string;
  ssl?: string | SslOptions;
  options?: MySQLConnectionOptions;
}

type MySQLConnectionConfig = MySQLConnectionConfigRaw & MySQLReadWriteConfig;

interface PostgresConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  charset?: string;
  ssl?: boolean | Record<string, unknown>;
  searchPath?: string | string[];
  application_name?: string;
  options?: Record<string, unknown>;
}

interface SQLiteConnectionConfig {
  database: string;
  prefix?: string;
  foreign_key_constraints?: boolean;
}

interface SqlSrvConnectionConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  charset?: string;
  encrypt?: boolean;
  options?: Record<string, unknown>;
}

interface DatabaseConnections {
  mysql: MySQLConnectionConfig;
  pgsql: PostgresConnectionConfig;
  sqlite: SQLiteConnectionConfig;
  sqlsrv?: SqlSrvConnectionConfig; // optional if not used
}

type RedisClient = "ioredis" | "node-redis" | "upstash" | "deno-redis";

export type RedisConfigure<T extends RedisClient> = T extends "deno-redis"
  ? {
      host: string;
      port: number;
      password?: string;
      db?: number;
      username?: string;
      tls?: boolean;
      options?: Record<string, unknown>;
    }
  : T extends "upstash"
  ? {
      upstashUrl: string;
      upstashToken: string;
    }
  : T extends "ioredis"
  ? {
      ioredisUrl: string;
    }
  : T extends "node-redis"
  ? {
      nodeRedisUrl: string;
    }
  : never;

interface RedisConfig<T extends RedisClient = RedisClient> {
  client: T;
  connections: Record<string, RedisConfigure<T>>;
}

interface DatabaseConfig {
  default: SupportedDrivers;
  connections: DatabaseConnections;
  redis?: RedisConfig;
}

// logging

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

export interface LogConfig {
  default: string;
  channels: Channels;
}

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

export interface SessionConfig {
  driver:
    | "file"
    | "memory"
    | "redis"
    | "database"
    | "cookie"
    | "memcached"
    | "dynamodb"
    | "object";

  lifetime: number; // session lifetime in minutes

  expireOnClose: boolean; // expire when browser closes

  encrypt: boolean; // encrypt session data

  files: string; // file session storage path

  connection?: SupportedDrivers; // database or redis connection name

  table?: string; // database table name for sessions

  store?: string; // cache store name for cache-based drivers

  lottery: [number, number]; // sweeping lottery odds

  cookie: string; // cookie name

  path: string; // cookie path

  domain?: string | null; // cookie domain

  secure?: boolean; // HTTPS only

  httpOnly?: boolean; // accessible only via HTTP

  sameSite?: "lax" | "strict" | "none" | null; // same-site policy

  partitioned?: boolean; // partitioned cookie flag

  prefix?: string; // session key prefix (for redis, etc.)
}

export type CacheDriver = "file" | "redis" | "object" | "database";
export interface CacheConfig {
  default?: string;
  prefix?: string;
  stores?: Record<
    string,
    {
      driver: CacheDriver;
      // For file driver
      path?: string;
      // Uses connection depends on driver
      connection?: string;
      // per-store override
      prefix?: string;
      // for database driver
      table?: string;
    }
  >;
}

// this is the basis for the config items
// example staticConfig("database") will return this type
// or from Configure inside the function of route
// Route.get("/example", async ({request, Configure}) => {
//  const dbConfig = Configure.read("database");
//  this will return the DatabaseConfig type
//  console.log(dbConfig.default); // "mysql", "pgsql", "sqlite", or "sqlsrv"
// })

export interface ConfigItems {
  app: AppConfig;
  auth: AuthConfig;
  cache: CacheConfig;
  database: DatabaseConfig;
  logging: LogConfig;
  cors: CorsConfig;
  session: SessionConfig;
}
