// app.d.ts

interface AppMaintenanceConfig {
  /**
   * Maintenance Mode Driver (e.g., 'file', 'database')
   */
  driver: SessionConfig["driver"];

  /**
   * Maintenance Store Name
   */
  store: string | nullify;
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

  /**
   * Application Providers
   */
  providers?: (typeof ServiceProvider)[];
}

type AuthenticatableConstructor = typeof Authenticatable<any>;

/**
 * A provider config structure (like 'users', 'admins').
 */
interface AuthProvider {
  driver: "eloquent";
  model: AuthenticatableConstructor;
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

import { SslOptions } from "mysql2";
import { Authenticatable } from "Illuminate/Contracts/Auth/index.ts";
import { ServiceProvider } from "Illuminate/Support/index.ts";
import { IStorage } from "Illuminate/Support/Facades/Storage.ts";
import { AbstractStore } from "Illuminate/Cache/index.ts";

export type SupportedDrivers = "mysql" | "pgsql" | "sqlite" | "sqlsrv";

interface MySQLConnectionOptions {
  maxConnection: number;
}

export interface MySQLConnectionConfigRaw {
  driver: "mysql";
  port?: number;
  user?: string;
  host?: string | string[];
  password?: string;
  database?: string;
  charset?: string;
  timezone?: string;
  ssl?: string | SslOptions;
  options?: MySQLConnectionOptions;

  read?: {
    host?: string | string[];
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    charset?: string;
    timezone?: string;
    ssl?: string | SslOptions;
  };
  write?: {
    host?: string | string[];
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    charset?: string;
    timezone?: string;
    ssl?: string | SslOptions;
  };
  sticky?: boolean;
}

type MySQLConnectionConfig = MySQLConnectionConfigRaw;

type PgSQLReadWriteConfig = {
  host?: string | string[];
  port?: number;
  user?: string;
  password?: string;
};

export interface PostgresConnectionConfig {
  driver: "pgsql";
  host: string;
  read?: PgSQLReadWriteConfig;
  write?: PgSQLReadWriteConfig;
  port: number;
  user: string;
  password: string;
  database: string;
  charset?: string;
  poolSize?: number;
  ssl?: boolean | Record<string, unknown>;
  searchPath?: string | string[];
  application_name?: string;
  options?: Record<string, unknown>;
}

interface SQLiteConnectionConfig {
  driver: "sqlite";
  database: string;
}

type SQLSrvReadWriteConfig = {
  host?: string | string[];
  port?: number;
  user?: string;
  password?: string;
};

export interface SqlSrvConnectionConfig {
  driver: "sqlsrv";
  host: string;
  port?: number;
  read?: SQLSrvReadWriteConfig;
  write?: SQLSrvReadWriteConfig;
  user: string;
  password: string;
  database: string;
  charset?: string;
  encrypt?: boolean;
  options?: Record<string, unknown>;
}

export interface MongoConnectionConfig {
  driver: "mongodb";
  database: string;
  uri?: string;
  host?: string;
  port?: number;
  tls?: boolean;
  username?: string;
  password?: string;

  options?: {
    database?: "admin" | string; // 👈 this is the authDb
    mechanism?: "SCRAM-SHA-1" | "SCRAM-SHA-256" | "MONGODB-X509";
    retryWrites?: boolean;
    appName?: string;
  };
}

type DatabaseConnections = {
  [connectionName: string]:
    | MySQLConnectionConfig
    | PostgresConnectionConfig
    | SQLiteConnectionConfig
    | SqlSrvConnectionConfig
    | MongoConnectionConfig;
};

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

type RedisUpstash = {
  client: "upstash";
  default: string;
  connections: Record<string, RedisConfigure<"upstash">>;
};

type RedisDenoRedis = {
  client: "deno-redis";
  default: string;
  connections: Record<string, RedisConfigure<"deno-redis">>;
};

type RedisNodeRedis = {
  client: "node-redis";
  default: string;
  connections: Record<string, RedisConfigure<"node-redis">>;
};

type RedisIORedis = {
  client: "ioredis";
  default: string;
  connections: Record<string, RedisConfigure<"ioredis">>;
};

type RedisConfig =
  | RedisUpstash
  | RedisDenoRedis
  | RedisNodeRedis
  | RedisIORedis;

interface DatabaseConfig {
  default: string;
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
  driver: Exclude<CacheDriver, "dynamodb" | "mongodb"> | "cache";

  lifetime: number; // session lifetime in minutes

  expireOnClose: boolean; // expire when browser closes

  encrypt: boolean; // encrypt session data

  files: string; // file session storage path

  connection: string | null; // database or redis connection name

  table: string | null; // database table name for sessions

  store: string | null; // cache store name for cache-based drivers

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

export type CacheDriver =
  | "file"
  | "redis"
  | "object"
  | "database"
  | "memory"
  | "memcached"
  | "dynamodb"
  | "mongodb"
  | "custom";

type CacheStoreFile = {
  driver: "file";
  path: string;
  prefix?: string;
};

type CacheStoreRedis = {
  driver: "redis";
  connection: string;
  prefix?: string;
};

type CacheStoreObject = {
  driver: "object";
  prefix?: string;
};

type CacheStoreDatabase = {
  driver: "database";
  connection: string;
  table: string;
  prefix?: string;
};

type CacheStoreMemory = {
  driver: "memory";
  prefix?: string;
};

type CacheStoreMemcached = {
  driver: "memcached";
  servers: {
    host: string;
    port: number;
    weight?: number;
  }[];
  prefix?: string;
};

type CacheStoreDynamoDB = {
  driver: "dynamodb";
  key: string;
  secret: string;
  region: string;
  partitionKey: string;
  table: string;
  prefix?: string;
};

type CacheStoreMongoDB = {
  driver: "mongodb";
  connection: string;
  collection: string;
  prefix?: string;
};

type CacheStoreCustom = {
  driver: "custom";
  prefix?: string;
  class: typeof AbstractStore;
};

type CacheStore = Record<
  string,
  | CacheStoreFile
  | CacheStoreRedis
  | CacheStoreObject
  | CacheStoreDatabase
  | CacheStoreMemory
  | CacheStoreMemcached
  | CacheStoreDynamoDB
  | CacheStoreMongoDB
  | CacheStoreCustom
>;

export interface CacheConfig {
  default?: string;
  prefix?: string;
  stores?: CacheStore;
}

// this is the basis for the config items
// example config("database") will return this type
// or from Configure inside the function of route
// Route.get("/example", async ({request, Configure}) => {
//  const dbConfig = Configure.read("database");
//  this will return the DatabaseConfig type
//  console.log(dbConfig.default); // "mysql", "pgsql", "sqlite", or "sqlsrv"
// })

export interface JWTProviders {
  jwt: string;
  auth: string;
  storage: string;
}

export type JWTRequiredClaims = "iss" | "iat" | "exp" | "nbf" | "sub" | "jti";

export interface JWTConfig {
  secret: string;
  ttl: number; // token lifetime in minutes
  refresh_ttl: number; // refresh token lifetime in minutes
  algo: "HS256" | "HS384" | "HS512"; // JWT signing algorithm
  required_claims: JWTRequiredClaims[]; // required claims in the token
  blacklist_enabled: boolean; // blacklist enabled or not
  blacklist_grace_period: number; // grace period in seconds
  issuer: string; // token issuer
  audience: string[]; // token audience
  providers: JWTProviders;
}
interface DiskConfig {
  root: string;
  visibility?: "public";
}

export interface LocalDiskConfig extends DiskConfig {
  driver: "local";
}

export interface PublicDiskConfig extends DiskConfig {
  driver: "public";
  url: string;
  visibility: "public";
}

export interface S3DiskConfig {
  driver: "s3";
  key: string;
  secret: string;
  region: string;
  bucket: string;
  url?: string;
}

export interface CustomDiskConfig {
  driver: "custom";
  class: typeof IStorage;
}

export interface FileSystemConfig {
  default: string;
  disks: Record<
    string,
    LocalDiskConfig | PublicDiskConfig | S3DiskConfig | CustomDiskConfig
  >;
}
export interface ConfigItems {
  app: AppConfig;
  auth: AuthConfig;
  cache: CacheConfig;
  database: DatabaseConfig;
  filesystems: FileSystemConfig;
  jwt: JWTConfig;
  logging: LogConfig;
  cors: CorsConfig;
  session: SessionConfig;
}
