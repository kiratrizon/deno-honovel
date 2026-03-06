import { Pool } from "@db/pgsql";
import { QueryResultDerived } from "Database";

class PgSQL {
  public static async query<T extends keyof QueryResultDerived>(
    pool: Pool,
    query: string,
    params: unknown[] = [],
  ): Promise<QueryResultDerived[T]> {
    const cleanedQuery = query.trim().toLowerCase();
    const queryType = cleanedQuery.startsWith("with")
      ? "select"
      : cleanedQuery.split(/\s+/)[0];

    const client = await pool.connect();
    try {
      // DQL: Data Queries (SELECT, SHOW, PRAGMA)
      if (["select", "show", "pragma"].includes(queryType)) {
        const result = await client.queryObject(query, params);
        return (result.rows as QueryResultDerived[T]) || [];
      }

      // DML: Data Manipulation (INSERT, UPDATE, DELETE)
      if (["insert", "update", "delete"].includes(queryType)) {
        // Check if query has RETURNING clause for INSERT
        const hasReturning = cleanedQuery.includes("returning");

        if (hasReturning) {
          const result = await client.queryObject(query, params);
          const firstRow = result.rows[0] as
            | Record<string, unknown>
            | undefined;
          const lastInsertRowId =
            queryType === "insert" && firstRow && "id" in firstRow
              ? Number(firstRow.id)
              : null;
          return {
            affected: result.rowCount ?? 0,
            lastInsertRowId,
            raw: result,
          } as QueryResultDerived[T];
        } else {
          const result = await client.queryArray(query, params);
          return {
            affected: result.rowCount ?? 0,
            lastInsertRowId: null,
            raw: result,
          } as QueryResultDerived[T];
        }
      }

      // DDL: Data Definition (CREATE, ALTER, DROP, TRUNCATE, RENAME)
      if (
        ["create", "alter", "drop", "truncate", "rename"].includes(queryType)
      ) {
        const result = await client.queryArray(query, params);
        return {
          message: "Executed",
          affected: result.rowCount ?? 0,
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
        ].includes(queryType)
      ) {
        const result = await client.queryArray(query, params);
        return {
          message: `${queryType.toUpperCase()} executed`,
          raw: result,
        } as QueryResultDerived[T];
      }

      // Default: Generic execution
      const result = await client.queryArray(query, params);
      return {
        message: "Query executed",
        affected: result.rowCount ?? 0,
        raw: result,
      } as QueryResultDerived[T];
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error("PostgreSQL Error:", error.message);
      console.error("Query:", query);
      console.error("Params:", params);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default PgSQL;
