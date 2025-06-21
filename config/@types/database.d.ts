// types/DatabaseConfig.d.ts

import { SslOptions } from "npm:mysql2@^2.3.3";

export type SupportedDrivers = "mysql" | "pgsql" | "sqlite" | "sqlsrv";

interface MySQLConnectionOptions {
    maxConnection: number;
}
export interface MySQLConnectionConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    charset?: string;
    timezone?: string;
    ssl?: string | SslOptions;
    options?: MySQLConnectionOptions
}

export interface PostgresConnectionConfig {
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

export interface SQLiteConnectionConfig {
    database: string;
    prefix?: string;
    foreign_key_constraints?: boolean;
}

export interface SqlSrvConnectionConfig {
    host: string;
    port?: number;
    user: string;
    password: string;
    database: string;
    charset?: string;
    encrypt?: boolean;
    options?: Record<string, unknown>;
}

export interface DatabaseConnections {
    mysql: MySQLConnectionConfig;
    pgsql: PostgresConnectionConfig;
    sqlite: SQLiteConnectionConfig;
    sqlsrv?: SqlSrvConnectionConfig; // optional if not used
}

export interface DatabaseConfig {
    default: SupportedDrivers;
    connections: DatabaseConnections;
}
