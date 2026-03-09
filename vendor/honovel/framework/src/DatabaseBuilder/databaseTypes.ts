export type QueryResult =
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

type DDL = {
  message: string;
  affected?: number;
  raw: unknown;
};

type DML = {
  affected: number;
  lastInsertRowId: number | null;
  raw: unknown;
};

type DQL = Record<string, unknown>[] | [];

type TCL = {
  message: string;
  raw: unknown;
};

export interface QueryResultDerived {
  // DQL: Data Query Language
  select: DQL;
  pragma: DQL;
  explain: DQL;
  show: DQL;
  describe: DQL;

  // DML: Data Manipulation Language
  insert: DML;
  update: DML;
  delete: DML;
  replace: DML;
  merge: DML;

  // DDL: Data Definition Language
  create: DDL;
  alter: DDL;
  drop: DDL;
  truncate: DDL;
  rename: DDL;

  // TCL: Transaction Control Language
  begin: TCL;
  commit: TCL;
  rollback: TCL;
  savepoint: TCL;
  release: TCL;
  set: TCL; // e.g., SET AUTOCOMMIT=0;
  use: TCL; // e.g., USE database_name;
}

export const sqlReservedWords = [
  "add",
  "all",
  "alter",
  "and",
  "any",
  "as",
  "asc",
  "backup",
  "between",
  "by",
  "case",
  "check",
  "column",
  "constraint",
  "create",
  "database",
  "default",
  "delete",
  "desc",
  "distinct",
  "drop",
  "exec",
  "exists",
  "foreign",
  "from",
  "full",
  "group",
  "having",
  "if",
  "in",
  "index",
  "inner",
  "insert",
  "into",
  "is",
  "join",
  "key",
  "left",
  "like",
  "limit",
  "not",
  "null",
  "on",
  "or",
  "order",
  "outer",
  "primary",
  "procedure",
  "right",
  "rownum",
  "select",
  "set",
  "table",
  "top",
  "truncate",
  "union",
  "unique",
  "update",
  "values",
  "view",
  "where",
  "with",
];
