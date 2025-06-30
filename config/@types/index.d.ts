// types/DatabaseConfig.d.ts

import { SslOptions } from "npm:mysql2@^2.3.3";

type SupportedDrivers = "mysql" | "pgsql" | "sqlite" | "sqlsrv";

interface MySQLConnectionOptions {
  maxConnection: number;
}
interface MySQLConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  charset?: string;
  timezone?: string;
  ssl?: string | SslOptions;
  options?: MySQLConnectionOptions;
}

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

interface DatabaseConfig {
  default: SupportedDrivers;
  connections: DatabaseConnections;
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

// this is the basis for the config items
// example staticConfig("database") will return this type
// or from Configure inside the function of route
// Route.get("/example", async ({request, Configure}) => {
//  const dbConfig = Configure.read("database");
//  this will return the DatabaseConfig type
//  console.log(dbConfig.default); // "mysql", "pgsql", "sqlite", or "sqlsrv"
// })

export interface ConfigItems {
  database: DatabaseConfig;
  logging: LogConfig;
  cors: CorsConfig;
}
