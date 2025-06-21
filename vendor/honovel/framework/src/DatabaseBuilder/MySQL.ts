import type {
    Pool,
    PoolConnection,
    ResultSetHeader,
    RowDataPacket,
    OkPacket,
} from "npm:mysql2/promise";

import mysql from "npm:mysql2@^2.3.3/promise";

type QueryResult =
    | RowDataPacket[]
    | RowDataPacket[][]
    | OkPacket
    | ResultSetHeader;

class MySQL {
    public static async query(
        client: Pool | PoolConnection,
        query: string,
        params: unknown[] = [],
    ): Promise<any> {
        const queryType = query.trim().split(" ")[0].toLowerCase();

        try {
            const [result] = await client.query(query, params) as [QueryResult, unknown];

            // DML: Data Manipulation (INSERT, UPDATE, DELETE)
            if (["insert", "update", "delete"].includes(queryType)) {
                if ("affectedRows" in result) {
                    return {
                        type: queryType,
                        affected: result.affectedRows ?? 0,
                        insertId: "insertId" in result ? result.insertId : null,
                        raw: result,
                    };
                }
            }

            // DDL: Data Definition (CREATE, ALTER, DROP, etc.)
            if (["create", "alter", "drop", "truncate", "rename"].includes(queryType)) {
                return {
                    type: queryType,
                    message: "message" in result ? result.message : "Executed",
                    affected: "affectedRows" in result ? result.affectedRows : undefined,
                    raw: result,
                };
            }

            // SELECT and other queries
            return result;

        } catch (e: any) {
            const formattedQuery = mysql.format(query, params);
            console.log(formattedQuery);
            throw new Error(e.message ?? `Unknown database error: ${formattedQuery}`);
        }
    }
}

export default MySQL;
