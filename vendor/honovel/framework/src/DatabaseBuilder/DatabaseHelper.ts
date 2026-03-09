import mysql, { Pool as MPool } from "mysql2/promise";
import MySQL from "./MySQL.ts";
import { Pool as PgPool } from "@db/pgsql";
import PgSQL from "./PostgreSQL.ts";
import mssql from "mssql";

export default class DatabaseHelper {
  private dbConfig = config("database");

  constructor(private connection: string) {}

  private async getConnectionConfig() {
    const connection = this.connection;
    const dbConfig = this.dbConfig.connections[connection];
    if (!dbConfig) {
      throw new Error(`Database connection "${connection}" not found.`);
    }
    const driver = dbConfig.driver;
    switch (driver) {
      case "mysql": {
        const fromReadOrWrite = dbConfig.read || dbConfig.write;
        const conf: Record<string, unknown> = {};
        if (isset(fromReadOrWrite)) {
          conf.host =
            (isArray(fromReadOrWrite.host)
              ? fromReadOrWrite.host[0]
              : fromReadOrWrite.host) ||
            dbConfig.host ||
            "localhost";
          conf.port = fromReadOrWrite.port || dbConfig.port || 3306;
          conf.user = fromReadOrWrite.user || dbConfig.user || "root";
          conf.password = fromReadOrWrite.password || dbConfig.password || "";
        } else {
          conf.host = dbConfig.host || "localhost";
          conf.port = dbConfig.port || 3306;
          conf.user = dbConfig.user || "root";
          conf.password = dbConfig.password || "";
        }
        const client = await mysql.createConnection(conf);
        return client as MPool;
      }
      case "pgsql": {
        const fromReadOrWrite = dbConfig.read || dbConfig.write;

        const conf = {
          hostname:
            (isArray(fromReadOrWrite?.host)
              ? fromReadOrWrite.host[0]
              : fromReadOrWrite?.host) ||
            dbConfig.host ||
            "localhost",
          port: fromReadOrWrite?.port || dbConfig.port || 5432,
          user: fromReadOrWrite?.user || dbConfig.user || "postgres",
          password: fromReadOrWrite?.password || dbConfig.password || "",
          database: "postgres",
          tls: dbConfig.tls || { enabled: false },
        };

        const poolSize = dbConfig.poolSize || 5;

        // Lazy connect
        const pool = new PgPool(conf, poolSize, true);

        return pool;
      }
      case "sqlite": {
        const dbPath = dbConfig.database || databasePath("database.sqlite");
        const module = await import("jsr:@db/sqlite");
        const SqliteDB = module.Database;
        const client = new SqliteDB(dbPath);
        return client;
      }
      case "sqlsrv": {
        const fromReadOrWrite = dbConfig.read || dbConfig.write;
        const conf: Record<string, unknown> = {};
        if (isset(fromReadOrWrite)) {
          conf.server =
            (isArray(fromReadOrWrite.host)
              ? fromReadOrWrite.host[0]
              : fromReadOrWrite.host) ||
            dbConfig.host ||
            "localhost";
          conf.port = fromReadOrWrite.port || dbConfig.port || 1433;
          conf.user = fromReadOrWrite.user || dbConfig.user || "sa";
          conf.password = fromReadOrWrite.password || dbConfig.password || "";
        } else {
          conf.server = dbConfig.host || "localhost";
          conf.port = dbConfig.port || 1433;
          conf.user = dbConfig.user || "sa";
          conf.password = dbConfig.password || "";
        }
        conf.database = "master"; // SQL Server requires a database to connect
        const client = new mssql.ConnectionPool(conf);
        await client.connect();
        return client;
      }
    }

    throw new Error(`Unsupported database driver: ${dbConfig.driver}`);
  }

  public async askIfDBExist(): Promise<boolean> {
    const dbType = this.dbConfig.connections[this.connection].driver;
    const conn = await this.getConnectionConfig();

    try {
      switch (dbType) {
        case "mysql": {
          const sql = `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`;
          const result = await MySQL.query<"select">(conn, sql, [
            this.dbConfig.connections[this.connection].database,
          ]);
          return result.length > 0;
        }
        case "pgsql": {
          const sql = `SELECT datname FROM pg_database WHERE datname = $1`;
          const result = await PgSQL.query<"select">(conn, sql, [
            this.dbConfig.connections[this.connection].database,
          ]);
          return result.length > 0;
        }
        case "sqlite": {
          return await pathExist(
            this.dbConfig.connections[this.connection].database,
          );
        }
        case "sqlsrv": {
          const sql = `SELECT name FROM sys.databases WHERE name = @dbName`;
          const request = (conn as mssql.ConnectionPool).request();
          request.input(
            "dbName",
            mssql.NVarChar,
            this.dbConfig.connections[this.connection].database,
          );
          const result = await request.query(sql);
          return result.recordset.length > 0;
        }
      }
      throw new Error(`Unsupported database driver: ${dbType}`);
    } finally {
      // Close connection for all databases
      if (dbType === "mysql") {
        await (conn as MPool).end();
      } else if (dbType === "pgsql") {
        await (conn as PgPool).end();
      } else if (dbType === "sqlite") {
        // @ts-ignore - SQLite Database has close() method
        conn.close();
      } else if (dbType === "sqlsrv") {
        await (conn as mssql.ConnectionPool).close();
      }
    }
  }

  public async createDatabase(): Promise<void> {
    const dbType = this.dbConfig.connections[this.connection].driver;
    const conn = await this.getConnectionConfig();
    const dbName = this.dbConfig.connections[this.connection].database;

    try {
      switch (dbType) {
        case "mysql": {
          const sql = `CREATE DATABASE IF NOT EXISTS \`${dbName}\``;
          await MySQL.query<"create">(conn, sql);
          break;
        }
        case "pgsql": {
          const sql = `CREATE DATABASE "${dbName}"`;
          await PgSQL.query<"create">(conn, sql);
          break;
        }
        case "sqlite": {
          // SQLite databases are created automatically when connecting
          break;
        }
        case "sqlsrv": {
          const sql = `
            IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = @dbName)
            BEGIN
              CREATE DATABASE [${dbName}]
            END
          `;
          const request = (conn as mssql.ConnectionPool).request();
          request.input("dbName", mssql.NVarChar, dbName);
          await request.query(sql);
          break;
        }
      }
    } finally {
      // Close connection for all databases
      if (dbType === "mysql") {
        await (conn as MPool).end();
      } else if (dbType === "pgsql") {
        await (conn as PgPool).end();
      } else if (dbType === "sqlite") {
        // @ts-ignore - SQLite Database has close() method
        conn.close();
      } else if (dbType === "sqlsrv") {
        await (conn as mssql.ConnectionPool).close();
      }
    }
  }

  public getDatabaseName(): string {
    return this.dbConfig.connections[this.connection].database as string;
  }
}
