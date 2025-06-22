import { DB, QueryParameter } from "https://deno.land/x/sqlite@v3.7.0/mod.ts";

type QueryResult =
    | Record<string, unknown>[]
    | {
        affected: number;
        lastInsertRowId: number | null;
        raw: unknown;
    }
    | {
        message: string;
        affected?: number;
        raw: unknown;
    };

class SQLite {
    public static async query(
        db: DB,
        query: string,
        params: QueryParameter[] = [],
    ): Promise<QueryResult> {
        const queryType = query.trim().split(" ")[0].toLowerCase();

        try {
            if (["select", "pragma"].includes(queryType)) {
                const result: Record<string, unknown>[] = [];
                for (const row of db.queryEntries(query, params)) {
                    result.push(row);
                }
                return result;
            }

            db.query(query, params);
            const lastInsertRowId = db.lastInsertRowId;
            const changes = db.changes;

            if (["insert", "update", "delete"].includes(queryType)) {
                return {
                    affected: changes,
                    lastInsertRowId: queryType === "insert" ? lastInsertRowId : null,
                    raw: { lastInsertRowId, changes },
                };
            }

            if (["create", "alter", "drop", "truncate", "rename"].includes(queryType)) {
                return {
                    message: "Executed",
                    affected: changes,
                    raw: { changes },
                };
            }

            return { message: "Query executed", raw: {} };
        } catch (e: unknown) {
            const error = e instanceof Error ? e : new Error(String(e));
            console.error("SQLite Error:", error.message);
            console.error("Query:", query);
            console.error("Params:", params);
            throw error;
        }
    }
}

export default SQLite;
