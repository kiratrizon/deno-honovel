import mssql from "mssql";
import { QueryResultDerived } from "Database";

class MsSQL {
  public static async query<T extends keyof QueryResultDerived>(
    pool: mssql.ConnectionPool,
    query: string,
    params: unknown[] = [],
  ): Promise<QueryResultDerived[T]> {
    const queryType = query.trim().split(/\s+/)[0].toLowerCase();

    try {
      const request = pool.request();

      // Bind parameters (@p1, @p2, etc.)
      params.forEach((param, index) => {
        const paramName = `p${index + 1}`;
        request.input(paramName, param);
      });

      // DQL: Data Queries (SELECT, SHOW, etc.)
      if (["select", "show", "explain", "describe"].includes(queryType)) {
        const result = await request.query(query);
        return (result.recordset as QueryResultDerived[T]) || [];
      }

      // DML: Data Manipulation (INSERT, UPDATE, DELETE)
      if (["insert", "update", "delete"].includes(queryType)) {
        const result = await request.query(query);

        // For INSERT with OUTPUT clause, we might get returned rows
        const hasOutput = query.toLowerCase().includes("output");
        let lastInsertRowId: number | null = null;

        if (
          queryType === "insert" &&
          hasOutput &&
          result.recordset?.length > 0
        ) {
          // Try to get ID from OUTPUT clause
          const firstRow = result.recordset[0];
          if (firstRow && typeof firstRow === "object") {
            // Common column names for IDs
            const idKeys = ["id", "ID", "Id", "IDENTITY"];
            for (const key of idKeys) {
              if (key in firstRow) {
                lastInsertRowId = Number(
                  firstRow[key as keyof typeof firstRow],
                );
                break;
              }
            }
          }
        }

        return {
          affected: result.rowsAffected[0] || 0,
          lastInsertRowId,
          raw: result,
        } as QueryResultDerived[T];
      }

      // DDL: Data Definition (CREATE, ALTER, DROP, TRUNCATE, RENAME)
      if (
        ["create", "alter", "drop", "truncate", "rename"].includes(queryType)
      ) {
        const result = await request.query(query);
        return {
          message: "Executed",
          affected: result.rowsAffected[0] || 0,
          raw: result,
        } as QueryResultDerived[T];
      }

      // TCL: Transaction Control (BEGIN, COMMIT, ROLLBACK, SAVEPOINT)
      if (
        ["begin", "commit", "rollback", "save", "set", "use"].includes(
          queryType,
        )
      ) {
        const result = await request.query(query);
        return {
          message: `${queryType.toUpperCase()} executed`,
          raw: result,
        } as QueryResultDerived[T];
      }

      // Default: Generic execution
      const result = await request.query(query);
      return {
        message: "Query executed",
        affected: result.rowsAffected[0] || 0,
        raw: result,
      } as QueryResultDerived[T];
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error("SQL Server Error:", error.message);
      console.error("Query:", query);
      console.error("Params:", params);
      throw error;
    }
  }
}

export default MsSQL;
