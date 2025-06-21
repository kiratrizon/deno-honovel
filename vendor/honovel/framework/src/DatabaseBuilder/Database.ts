import { DatabaseConfig } from "../../../../../config/@types/database.d.ts";
import mysql, {
    ConnectionOptions, Pool,
    PoolConnection,
} from "npm:mysql2@^2.3.3/promise";
import MySQL from "./MySQL.ts";

// This is for RDBMS like MySQL, PostgreSQL, etc.
export class Database {
    public static client: unknown;


    public setClient(client: unknown): void {

    }

    public async runQuery(query: string, params: unknown[] = []): Promise<unknown> {
        this.init();
        const dbType = env("DB_CONNECTION", empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql");
        if (dbType == "mysql") {
            return await MySQL.query(Database.client as (Pool | PoolConnection), query, params);
        }
    }

    private init(): void {
        if (!isset(Database.client)) {
            const databaseObj = staticConfig("database") as DatabaseConfig;
            const dbType = env("DB_CONNECTION", empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql");
            switch (dbType) {
                case "sqlite": {
                    // 
                    break;
                }
                case "mysql": {
                    // 
                    const dbConn = databaseObj?.connections?.mysql;
                    if (!isset(dbConn)) {
                        throw new Error("MySQL connection configuration is missing.");
                    }

                    const secureConnection: Partial<ConnectionOptions> = {
                        host: dbConn.host,
                        port: dbConn.port,
                        user: dbConn.user,
                        password: dbConn.password,
                        database: dbConn.database,
                        charset: dbConn.charset || "utf8mb4",
                    }
                    if (isset(dbConn.timezone)) {
                        secureConnection.timezone = dbConn.timezone;
                    }
                    if (isset(dbConn.ssl)) {
                        secureConnection.ssl = dbConn.ssl;
                    }
                    if (isset(dbConn.options) && !empty(dbConn.options)) {
                        const opts = dbConn.options;
                        if (opts.maxConnection) {
                            secureConnection.connectionLimit = opts.maxConnection;
                        }
                    }
                    Database.client = mysql.createPool(secureConnection);
                    break;
                }
                case "pgsql": {
                    // 
                    break;
                }
                case "sqlsrv": {
                    // 
                    break;
                }
            }
        }
    }
}

Deno.addSignalListener("SIGINT", () => {
    const dbType = env("DB_CONNECTION", empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql");
    if (Database.client) {
        if (dbType == "mysql") {
            (Database.client as (Pool | PoolConnection)).end().then(() => {
                console.log("MySQL connection closed gracefully.");
            }).catch((err) => {
                console.error("Error closing MySQL connection:", err);
            });
        }

        Database.client = undefined;
    }
});