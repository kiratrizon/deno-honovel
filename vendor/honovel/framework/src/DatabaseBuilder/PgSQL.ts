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
    const queryType = query.trim().split(/\s+/)[0].toLowerCase();

    try {
      if (queryType === "select" || queryType === "pragma") {
        const result: QueryObjectResult = await client.queryObject(
          query,
          params as QueryArguments
        );
        return result.rows as QueryResultDerived[T];
      }

      if (["insert", "update", "delete"].includes(queryType)) {
        const result = await client.queryObject(
          query,
          params as QueryArguments
        );
        let lastInsertRowId: number | null = null;

        if (queryType === "insert") {
          const firstRow = result.rows[0] as
            | Record<string, unknown>
            | undefined;
          if (firstRow && "id" in firstRow) {
            lastInsertRowId = Number(firstRow.id);
          }
        }

        return {
          affected: result.rowCount,
          lastInsertRowId,
          raw: result,
        } as QueryResultDerived[T];
      }

      if (
        ["create", "alter", "drop", "truncate", "rename"].includes(queryType)
      ) {
        const result = await client.queryObject(query);
        return {
          message: "Executed",
          affected: result.rowCount,
          raw: result,
        } as QueryResultDerived[T];
      }

      // fallback
      const result = await client.queryObject(query, params as QueryArguments);
      return {
        message: "Query executed",
        raw: result,
      } as QueryResultDerived[T];
    } finally {
      client.release();
    }
  }
}

export default PgSQL;
