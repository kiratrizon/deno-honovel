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
import { TLSOptions } from "@db/pgsql";

/**
 * Supported database drivers
 * - mysql: MySQL/MariaDB
 * - pgsql: PostgreSQL
 * - sqlite: SQLite
 * - sqlsrv: Microsoft SQL Server
 */
export type SupportedDrivers = "mysql" | "pgsql" | "sqlite" | "sqlsrv";

interface MySQLConnectionOptions {
  /**
   * Maximum number of connections in the connection pool
   * Higher values allow more concurrent queries but use more resources
   */
  maxConnection: number;

  /**
   * Return date/time values as strings instead of JavaScript Date objects
   * This can help avoid timezone issues and preserve original formatting
   */
  dateStrings?: boolean;
}

export interface MySQLConnectionConfigRaw {
  driver: "mysql";
  /** Database port (default: 3306) */
  port?: number;
  /** Database username */
  user?: string;
  /** Database host (can be array for load balancing) */
  host?: string | string[];
  /** Database password */
  password?: string;
  /** Database name */
  database?: string;
  /** Character set (e.g., 'utf8mb4') */
  charset?: string;
  /** Timezone for date/time operations (e.g., '+00:00') */
  timezone?: string;
  /** SSL certificate configuration */
  ssl?: string | SslOptions;
  /** Additional MySQL connection options */
  options?: MySQLConnectionOptions;

  /**
   * Read replica configuration for database read operations
   * Helps distribute read load across multiple servers
   */
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
  /**
   * Write replica configuration for database write operations
   * All INSERT, UPDATE, DELETE operations use this connection
   */
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
  /**
   * Sticky sessions - if true, after a write, subsequent reads use write connection
   * Prevents read-your-own-writes issues with replication lag
   */
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
  /** Database host */
  host: string;
  /** Read replica configuration */
  read?: PgSQLReadWriteConfig;
  /** Write replica configuration */
  write?: PgSQLReadWriteConfig;
  /** Database port (default: 5432) */
  port: number;
  /** Database username */
  user: string;
  /** Database password */
  password: string;
  /** Database name */
  database: string;
  /** Character set encoding (e.g., 'utf8') */
  charset?: string;
  /** Maximum number of connections in pool */
  poolSize?: number;
  /** SSL/TLS configuration */
  ssl?: boolean | Record<string, unknown>;
  /** PostgreSQL schema search path */
  searchPath?: string | string[];
  /** Application identifier shown in pg_stat_activity */
  application_name?: string;
  /** TLS configuration */
  tls?: TLSOptions;
}

interface SQLiteConnectionConfig {
  driver: "sqlite";
  /** Path to SQLite database file (e.g., 'database/database.sqlite') */
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
  /** Database host */
  host: string;
  /** Database port (default: 1433) */
  port?: number;
  /** Read replica configuration */
  read?: SQLSrvReadWriteConfig;
  /** Write replica configuration */
  write?: SQLSrvReadWriteConfig;
  /** Database username */
  user: string;
  /** Database password */
  password: string;
  /** Database name */
  database: string;
  /** Character set encoding */
  charset?: string;
  /** Enable encryption (recommended for production) */
  encrypt?: boolean;
  /** Additional SQL Server connection options */
  options?: Record<string, unknown>;
}

export interface MongoConnectionConfig {
  driver: "mongodb";
  /** MongoDB database name */
  database: string;
  /**
   * Full MongoDB connection URI (alternative to host/port)
   * Example: "mongodb://username:password@host:port/database"
   */
  uri?: string;
  /** MongoDB host (used if uri is not provided) */
  host?: string;
  /** MongoDB port (default: 27017) */
  port?: number;
  /** Enable TLS/SSL connection */
  tls?: boolean;
  /** MongoDB username for authentication */
  username?: string;
  /** MongoDB password for authentication */
  password?: string;

  /** Additional MongoDB connection options */
  options?: {
    /** Authentication database (usually 'admin') */
    database?: "admin" | string;
    /** Authentication mechanism */
    mechanism?: "SCRAM-SHA-1" | "SCRAM-SHA-256" | "MONGODB-X509";
    /** Enable retry writes for failed operations */
    retryWrites?: boolean;
    /** Application name shown in MongoDB logs */
    appName?: string;
  };
}

/**
 * Database connections configuration
 * Each key is a connection name that can be used with DB.connection('name')
 */
type DatabaseConnections = {
  [connectionName: string]:
    | MySQLConnectionConfig
    | PostgresConnectionConfig
    | SQLiteConnectionConfig
    | SqlSrvConnectionConfig
    | MongoConnectionConfig;
};

/**
 * Upstash Redis - Serverless Redis service
 * Install: deno task install:driver --redis upstash
 */
type UpstashRedis = {
  driver: "upstash";
  /** Upstash Redis REST URL */
  upstashUrl: string;
  /** Upstash Redis REST token */
  upstashToken: string;
};

/**
 * Deno Redis - Native Deno Redis client
 * Install: deno task install:driver --redis deno-redis
 */
type DenoRedis = {
  driver: "deno-redis";
  /** Redis host */
  host: string;
  /** Redis port (default: 6379) */
  port: number;
  /** Redis password (if required) */
  password?: string;
  /** Redis database number (0-15) */
  db?: number;
  /** Redis username (Redis 6+) */
  username?: string;
  /** Enable TLS/SSL */
  tls?: boolean;
  /** Additional connection options */
  options?: Record<string, unknown>;
};

/**
 * Node Redis - Popular Node.js Redis client
 * Install: deno task install:driver --redis node-redis
 */
type NodeRedis = {
  driver: "node-redis";
  /** Redis connection URL (redis://host:port) */
  nodeRedisUrl: string;
};

/**
 * IORedis - Fast Node.js Redis client
 * Install: deno task install:driver --redis ioredis
 */
type IORedis = {
  driver: "ioredis";
  /** Redis connection URL (redis://host:port) */
  ioredisUrl: string;
};

export type RedisConfigure = {
  ioredis: IORedis;
  upstash: UpstashRedis;
  "node-redis": NodeRedis;
  "deno-redis": DenoRedis;
};

/**
 * Available Redis client drivers
 * Choose based on your deployment (Upstash for serverless, others for traditional)
 */
export type RedisClient = "ioredis" | "upstash" | "node-redis" | "deno-redis";

export type RedisConfig = {
  /** Default Redis connection name */
  default: string;
  /** Named Redis connections */
  connections: Record<string, RedisConfigure[RedisClient]>;
};

interface DatabaseConfig {
  /** Default database connection name */
  default: string;
  /** Named database connections */
  connections: DatabaseConnections;
  /** Redis configuration (optional) */
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

/**
 * Available cache drivers
 * - file: Store cache in filesystem (dev only)
 * - redis: Fast in-memory cache with persistence
 * - object: In-memory cache (lost on restart)
 * - database: Store cache in database tables
 * - memory: High-performance in-memory cache
 * - memcached: Distributed memory cache
 * - dynamodb: AWS DynamoDB cache (install: deno task install:driver --cache dynamodb)
 * - mongodb: MongoDB cache (install: deno task install:driver --cache mongodb)
 * - custom: Custom cache driver extending AbstractStore
 */
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

/** File-based cache (NOT recommended for production) */
type CacheStoreFile = {
  driver: "file";
  /** Path to cache directory */
  path: string;
  /** Optional key prefix to avoid collisions */
  prefix?: string;
};

/** Redis cache store */
type CacheStoreRedis = {
  driver: "redis";
  /** Redis connection name from database.redis */
  connection: string;
  /** Optional key prefix */
  prefix?: string;
};

/** In-memory object cache (NOT recommended for production) */
type CacheStoreObject = {
  driver: "object";
  /** Optional key prefix */
  prefix?: string;
};

/** Database table cache store */
type CacheStoreDatabase = {
  driver: "database";
  /** Database connection name */
  connection: string;
  /** Table name for cache storage */
  table: string;
  /** Optional key prefix */
  prefix?: string;
};

/** In-memory cache using @avroit/memcached */
type CacheStoreMemory = {
  driver: "memory";
  /** Optional key prefix */
  prefix?: string;
};

/** Memcached distributed cache */
type CacheStoreMemcached = {
  driver: "memcached";
  /** List of Memcached servers */
  servers: {
    /** Server hostname or IP */
    host: string;
    /** Server port */
    port: number;
    /** Server weight for load balancing (optional) */
    weight?: number;
  }[];
  /** Optional key prefix */
  prefix?: string;
};

/** AWS DynamoDB cache (requires installation) */
type CacheStoreDynamoDB = {
  driver: "dynamodb";
  /** AWS access key ID */
  key: string;
  /** AWS secret access key */
  secret: string;
  /** AWS region (e.g., 'us-east-1') */
  region: string;
  /** DynamoDB partition key name */
  partitionKey: string;
  /** DynamoDB table name */
  table: string;
  /** Optional key prefix */
  prefix?: string;
};

/** MongoDB cache (requires installation) */
type CacheStoreMongoDB = {
  driver: "mongodb";
  /** MongoDB connection name from database config */
  connection: string;
  /** MongoDB collection name for cache */
  collection: string;
  /** Optional key prefix */
  prefix?: string;
};

/** Custom cache driver */
type CacheStoreCustom = {
  driver: "custom";
  /** Optional key prefix */
  prefix?: string;
  /** Custom store class extending AbstractStore */
  class: typeof AbstractStore;
};

/**
 * Cache stores configuration
 * Each key is a store name accessible via Cache.store('name')
 */
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
  /** Default cache store name */
  default?: string;
  /** Global key prefix for all cache stores */
  prefix?: string;
  /** Named cache stores */
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
