import mysql, { Pool, PoolConnection } from "npm:mysql2@^2.3.3/promise";
import { QueryResultDerived } from "Database";

class MySQL {
  public static async query<T extends keyof QueryResultDerived>(
    client: Pool | PoolConnection,
    query: string,
    params: unknown[] = []
  ): Promise<QueryResultDerived[T]> {
    const queryType = query.trim().split(" ")[0].toLowerCase();

    try {
      const [result] = (await client.query(query, params)) as [
        QueryResultDerived[T],
        unknown
      ];

      // DML: Data Manipulation (INSERT, UPDATE, DELETE)
      if (["insert", "update", "delete"].includes(queryType)) {
        if ("affectedRows" in result) {
          return {
            affected: Number(result.affectedRows ?? 0),
            lastInsertRowId:
              "insertId" in result ? Number(result.insertId) : null,
            raw: result,
          } as QueryResultDerived[T];
        }
      }

      // DDL: Data Definition (CREATE, ALTER, DROP, etc.)
      if (
        ["create", "alter", "drop", "truncate", "rename"].includes(queryType)
      ) {
        return {
          message: "message" in result ? result.message : "Executed",
          affected:
            "affectedRows" in result ? Number(result.affectedRows) : undefined,
          raw: result,
        } as QueryResultDerived[T];
      }

      // SELECT and other queries
      return result as QueryResultDerived[T];
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      const formattedQuery = mysql.format(query, params);
      console.log(formattedQuery);
      throw error;
    }
  }
}

export default MySQL;
