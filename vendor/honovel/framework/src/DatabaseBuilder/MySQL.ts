import mysql, { Pool, PoolConnection } from "mysql2/promise";
import { QueryResultDerived } from "Database";

class MySQL {
  public static async query<T extends keyof QueryResultDerived>(
    client: Pool | PoolConnection,
    query: string,
    params: unknown[] = []
  ): Promise<QueryResultDerived[T]> {
    const queryType = query.trim().split(/\s+/)[0].toLowerCase();

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

      // DDL: Data Definition (CREATE, ALTER, DROP, TRUNCATE, RENAME)
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

      // TCL: Transaction Control (BEGIN, COMMIT, ROLLBACK, SAVEPOINT)
      if (
        [
          "begin",
          "start",
          "commit",
          "rollback",
          "savepoint",
          "release",
          "set",
          "use",
        ].includes(queryType)
      ) {
        return {
          message: `${queryType.toUpperCase()} executed`,
          raw: result,
        } as QueryResultDerived[T];
      }

      // DQL: Data Queries (SELECT, SHOW, PRAGMA)
      return (result as QueryResultDerived[T]) || [];
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      const formattedQuery = mysql.format(query, params);
      consoledeno.error(formattedQuery);
      throw error;
    }
  }
}

export default MySQL;
