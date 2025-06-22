import mysql, {
    Pool,
    PoolConnection,
    ResultSetHeader,
    RowDataPacket,
    OkPacket,
} from "npm:mysql2@^2.3.3/promise";

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
                        affected: result.affectedRows ?? 0,
                        insertId: "insertId" in result ? result.insertId : null,
                        raw: result,
                    };
                }
            }

            // DDL: Data Definition (CREATE, ALTER, DROP, etc.)
            if (["create", "alter", "drop", "truncate", "rename"].includes(queryType)) {
                return {
                    message: "message" in result ? result.message : "Executed",
                    affected: "affectedRows" in result ? result.affectedRows : undefined,
                    raw: result,
                };
            }

            // SELECT and other queries
            return result;

        } catch (e: unknown) {
            const error = e instanceof Error ? e : new Error(String(e));
            const formattedQuery = mysql.format(query, params);
            console.log(formattedQuery);
            throw error;
        }
    }
}

export default MySQL;
