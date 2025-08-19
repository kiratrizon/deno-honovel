import { Pool } from "@db/pgsql";
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
      // infer type automatically, no need to import
      const result = await client.queryObject(query, params);

      switch (queryType) {
        case "select":
        case "show":
        case "pragma":
          return (result.rows as QueryResultDerived[T]) || [];

        case "insert": {
          const firstRow = result.rows[0] as
            | Record<string, unknown>
            | undefined;
          const lastInsertRowId =
            firstRow && "id" in firstRow ? Number(firstRow.id) : null;
          return {
            affected: result.rowCount ?? 0,
            lastInsertRowId,
            raw: result,
          } as QueryResultDerived[T];
        }

        case "update":
        case "delete":
          return {
            affected: result.rowCount ?? 0,
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

        case "begin":
        case "start":
        case "commit":
        case "rollback":
        case "savepoint":
        case "release":
          return {
            message: `${queryType.toUpperCase()} executed`,
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
