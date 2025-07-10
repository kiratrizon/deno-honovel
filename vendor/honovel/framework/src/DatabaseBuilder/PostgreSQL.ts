import {
  Pool,
  QueryArguments,
  QueryObjectResult,
} from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { QueryResultDerived } from "Database";

class PgSQL {
  public static async query<T extends keyof QueryResultDerived>(
    pool: Pool,
    query: string,
    params: unknown[] = []
  ): Promise<QueryResultDerived[T]> {
    const client = await pool.connect();
    const cleanedQuery = query.trim().toLowerCase();
    const queryType = cleanedQuery.startsWith("with")
      ? "select"
      : cleanedQuery.split(/\s+/)[0];

    try {
      const result: QueryObjectResult = await client.queryObject(
        query,
        params as QueryArguments
      );

      switch (queryType) {
        case "select":
        case "pragma":
          return (result.rows as QueryResultDerived[T]) || [];

        case "insert": {
          const firstRow = result.rows[0] as
            | Record<string, unknown>
            | undefined;
          const lastInsertRowId =
            firstRow && "id" in firstRow ? Number(firstRow.id) : null;
          return {
            affected: result.rowCount,
            lastInsertRowId,
            raw: result,
          } as QueryResultDerived[T];
        }

        case "update":
        case "delete":
          return {
            affected: result.rowCount,
            lastInsertRowId: null,
            raw: result,
          } as QueryResultDerived[T];

        case "create":
        case "alter":
        case "drop":
        case "truncate":
        case "rename":
          return {
            message: "Executed",
            affected: result.rowCount ?? 0,
            raw: result,
          } as QueryResultDerived[T];

        default:
          return {
            message: "Query executed",
            affected: result.rowCount ?? 0,
            raw: result,
          } as QueryResultDerived[T];
      }
    } finally {
      client.release();
    }
  }
}

export default PgSQL;
