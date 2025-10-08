import { Database, RestBindParameters } from "jsr:@db/sqlite";
import { QueryResultDerived } from "Database";

class SQLite {
  public static async query<T extends keyof QueryResultDerived>(
    db: Database,
    query: string,
    params: unknown[] = []
  ): Promise<QueryResultDerived[T]> {
    const queryType = query.trim().split(/\s+/)[0].toLowerCase();

    try {
      if (["select", "pragma"].includes(queryType)) {
        const rows = db.prepare(query).all(params as RestBindParameters);
        return (rows as QueryResultDerived[T]) || [];
      }

      if (["insert", "update", "delete"].includes(queryType)) {
        const stmt = db.prepare(query);
        const result = stmt.run(...(params as RestBindParameters));
        return {
          affected: db.totalChanges,
          lastInsertRowId: queryType === "insert" ? db.lastInsertRowId : null,
          raw: result,
        } as QueryResultDerived[T];
      }

      if (
        ["create", "alter", "drop", "truncate", "rename"].includes(queryType)
      ) {
        db.exec(query); // no parameters supported in .exec
        return {
          message: "Executed",
          affected: db.totalChanges,
          raw: {},
        } as QueryResultDerived[T];
      }

      // TCL: BEGIN, COMMIT, ROLLBACK, SAVEPOINT, RELEASE
      if (
        ["begin", "commit", "rollback", "savepoint", "release"].includes(
          queryType
        )
      ) {
        db.exec(query);
        return {
          message: `${queryType.toUpperCase()} executed`,
          raw: {},
        } as QueryResultDerived[T];
      }

      // fallback generic execution with run
      const stmt = db.prepare(query);
      const result = stmt.run(...(params as RestBindParameters));
      return {
        message: "Query executed",
        raw: result,
      } as QueryResultDerived[T];
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      consoledeno.error("SQLite Error:", error.message);
      consoledeno.error("Query:", query);
      consoledeno.error("Params:", params);
      throw error;
    }
  }
}

export default SQLite;
