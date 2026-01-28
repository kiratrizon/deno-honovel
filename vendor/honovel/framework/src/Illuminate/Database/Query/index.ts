import { Database } from "Database";
import { DB } from "../../Support/Facades/index.ts";

export class SQLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SQLError";
  }
}

export class SQLRaw extends String {
  public override toString(): string {
    if (super.toString() === "") {
      throw new SQLError("SQLRaw cannot be empty");
    }
    return super.toString();
  }
}

type TInsertBuilder = {
  table: string;
  data: Array<Record<string, unknown>>;
};

type whereBetweenParams = [WherePrimitive | SQLRaw, WherePrimitive | SQLRaw];

export type sqlstring = SQLRaw | Builder | string;
export type Raw = SQLRaw | string;
export type WherePrimitive = Exclude<any, undefined>;
export type WhereValue = WherePrimitive | WherePrimitive[];
export type WhereOperator =
  | "="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "<>"
  | "LIKE"
  | "NOT LIKE"
  | "like"
  | "not like";

type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL" | "CROSS";
type OrderByDirection = "ASC" | "DESC" | "asc" | "desc";
type WhereSeparator = "AND" | "OR";
const placeHolderuse: string = "?";

// where
export class WhereInterpolator {
  protected database: Database;
  constructor(private dbType: string) {
    this.database = new Database(dbType);
  }
  protected fromJoin: boolean = false;
  protected whereClauses: [string, any[]][] = [];

  public where(column: string, value: WherePrimitive): this;
  public where(
    column: string,
    operator: WhereOperator,
    value: WherePrimitive
  ): this;
  public where(callback: (qb: WhereInterpolator) => void): this;
  public where(
    ...args: [
      string | ((qb: WhereInterpolator) => void),
      (WhereOperator | WherePrimitive)?,
      WherePrimitive?,
    ]
  ): this {
    this.whereProcess("AND", ...args);
    return this;
  }

  public orWhere(column: string, value: WherePrimitive): this;

  public orWhere(
    column: string,
    operator: WhereOperator,
    value: WherePrimitive
  ): this;
  public orWhere(callback: (qb: WhereInterpolator) => void): this;
  public orWhere(
    ...args: [
      string | ((qb: WhereInterpolator) => void),
      (WhereOperator | WherePrimitive)?,
      WherePrimitive?,
    ]
  ): this {
    this.whereProcess("OR", ...args);
    return this;
  }

  private whereClauseFilled(): boolean {
    if (this.fromJoin) {
      return !!(this.joinClauses.length + this.whereClauses.length);
    }
    return !!this.whereClauses.length;
  }
  private whereProcess(
    type: WhereSeparator,
    ...args: [
      string | ((qb: WhereInterpolator) => void),
      (WhereOperator | WherePrimitive)?,
      WherePrimitive?,
    ]
  ): void {
    let [columnOrFn, operatorOrValue, valueArg] = args;
    if (isFunction(columnOrFn)) {
      // to handle callback
      const qb = new WhereInterpolator(this.dbType);
      columnOrFn(qb);
      const getWhere = qb.getWhereClauses();
      const callbackClause: string[] = [];
      const callbackValues: WhereValue[] = [];
      getWhere.forEach(([clause, values]) => {
        callbackClause.push(clause);
        callbackValues.push(...values);
      });
      const mainStr = callbackClause.join(" ");
      if (type === "AND") {
        const myStr = this.whereClauseFilled()
          ? `AND (${mainStr})`
          : `(${mainStr})`;
        this.whereClauses.push([myStr, callbackValues]);
      } else if (type === "OR") {
        if (this.whereClauseFilled()) {
          this.whereClauses.push([`OR (${mainStr})`, callbackValues]);
        } else {
          throw new SQLError(
            "Provide a valid where clause first before using OR"
          );
        }
      }
      return;
    }
    columnOrFn = this.database.quoteIdentifier(columnOrFn as string);
    let column: string;
    let value: any;
    let operator: WhereOperator = "=";
    if (!isset(valueArg)) {
      value = operatorOrValue as WherePrimitive;
    } else {
      value = valueArg;
      operator = operatorOrValue as WhereOperator;
    }
    if (!empty(columnOrFn) && isString(columnOrFn)) {
      column = columnOrFn;
    } else {
      throw new SQLError("Invalid where clause");
    }
    let placeHolderOrValue = placeHolderuse;
    if (value instanceof SQLRaw) {
      placeHolderOrValue = value.toString();
      value = [];
    } else {
      value = [value];
    }
    const mainStr = `${column} ${operator} ${placeHolderOrValue}`;

    if (type === "AND") {
      const myStr = this.whereClauseFilled() ? `AND ${mainStr}` : mainStr;
      this.whereClauses.push([myStr, [...value]]);
    } else {
      if (this.whereClauseFilled()) {
        this.whereClauses.push([`OR ${mainStr}`, [...value]]);
      } else {
        throw new SQLError(
          "Provide a valid where clause first before using OR"
        );
      }
    }
    return;
  }

  protected getWhereClauses(): [string, WhereValue[]][] {
    return this.whereClauses;
  }

  public whereIn(column: string, values: WherePrimitive[]): this {
    this.whereInProcess("IN", "AND", column, values);
    return this;
  }

  public whereNotIn(column: string, values: WherePrimitive[]): this {
    this.whereInProcess("NOT IN", "AND", column, values);
    return this;
  }

  public orWhereIn(column: string, values: WherePrimitive[]): this {
    this.whereInProcess("IN", "OR", column, values);
    return this;
  }

  public orWhereNotIn(column: string, values: WherePrimitive[]): this {
    this.whereInProcess("NOT IN", "OR", column, values);
    return this;
  }

  private whereInProcess(
    operator: "NOT IN" | "IN",
    type: WhereSeparator,
    column: string,
    values: WherePrimitive[] | SQLRaw
  ): void {
    column = this.database.quoteIdentifier(column);
    if (values instanceof SQLRaw) {
      const placeHolderOrValue = values.toString();
      values = [];
      switch (type) {
        case "AND": {
          const myStr = this.whereClauseFilled()
            ? `AND ${column} ${operator} ${placeHolderOrValue}`
            : `${column} ${operator} ${placeHolderOrValue}`;
          this.whereClauses.push([myStr, []]);
          break;
        }
        case "OR": {
          if (this.whereClauseFilled()) {
            //
            this.whereClauses.push([
              `OR ${column} ${operator} ${placeHolderOrValue}`,
              [],
            ]);
          } else {
            //
            throw new SQLError(
              "Provide a valid where clause first before using OR"
            );
          }
          break;
        }
      }
      return;
    }

    if (isArray(values)) {
      if (!values.length) {
        throw new SQLError("Values for whereIn/whereNotIn cannot be empty");
      }
      const mainStr = `${column} ${operator} (${values
        .map(() => placeHolderuse)
        .join(", ")})`;
      switch (type) {
        case "AND": {
          const myStr = this.whereClauseFilled() ? `AND ${mainStr}` : mainStr;
          this.whereClauses.push([myStr, values]);
          break;
        }
        case "OR": {
          if (this.whereClauseFilled()) {
            this.whereClauses.push([`OR ${mainStr}`, values]);
          } else {
            throw new SQLError(
              "Provide a valid where clause first before using OR"
            );
          }
          break;
        }
      }
      return;
    }
  }

  public whereNull(column: string): this {
    this.whereNullProcess("IS NULL", "AND", column);
    return this;
  }

  public whereNotNull(column: string): this {
    this.whereNullProcess("IS NOT NULL", "AND", column);
    return this;
  }

  public orWhereNull(column: string): this {
    this.whereNullProcess("IS NULL", "OR", column);
    return this;
  }

  public orWhereNotNull(column: string): this {
    this.whereNullProcess("IS NOT NULL", "OR", column);
    return this;
  }

  private whereNullProcess(
    operator: "IS NULL" | "IS NOT NULL",
    type: WhereSeparator,
    column: string
  ): void {
    column = this.database.quoteIdentifier(column);
    const mainStr = `${column} ${operator}`;
    switch (type) {
      case "AND": {
        const myStr = this.whereClauseFilled() ? `AND ${mainStr}` : mainStr;
        this.whereClauses.push([myStr, []]);
        break;
      }
      case "OR": {
        if (this.whereClauseFilled()) {
          this.whereClauses.push([`OR ${mainStr}`, []]);
        } else {
          throw new SQLError(
            "Provide a valid where clause first before using OR"
          );
        }
        break;
      }
    }
  }

  public whereBetween(column: string, values: whereBetweenParams): this {
    this.whereBetweenProcess("BETWEEN", "AND", column, values);
    return this;
  }

  public whereNotBetween(column: string, values: whereBetweenParams): this {
    this.whereBetweenProcess("NOT BETWEEN", "AND", column, values);
    return this;
  }

  public orWhereBetween(column: string, values: whereBetweenParams): this {
    this.whereBetweenProcess("BETWEEN", "OR", column, values);
    return this;
  }

  public orWhereNotBetween(column: string, values: whereBetweenParams): this {
    this.whereBetweenProcess("NOT BETWEEN", "OR", column, values);
    return this;
  }

  private whereBetweenProcess(
    operator: "BETWEEN" | "NOT BETWEEN",
    type: WhereSeparator,
    column: string,
    values: whereBetweenParams
  ): void {
    if (!isArray(values) || values.length !== 2) {
      throw new SQLError(
        "Values for whereBetween must be an array of two elements"
      );
    }

    column = this.database.quoteIdentifier(column);

    let placeHolderOrValue1,
      placeHolderOrValue2 = placeHolderuse;
    const [start, end] = values;
    const newValues = [];
    if (start instanceof SQLRaw) {
      placeHolderOrValue1 = start.toString();
    } else {
      newValues.push(start);
    }
    if (end instanceof SQLRaw) {
      placeHolderOrValue2 = end.toString();
    } else {
      newValues.push(end);
    }
    if (!isset(start) || !isset(end)) {
      throw new SQLError("Both start and end values must be provided");
    }
    const mainStr = `${column} ${operator} ${placeHolderOrValue1} AND ${placeHolderOrValue2}`;
    switch (type) {
      case "AND": {
        const myStr = this.whereClauseFilled() ? `AND ${mainStr}` : mainStr;
        this.whereClauses.push([myStr, newValues]);
        break;
      }
      case "OR": {
        if (this.whereClauseFilled()) {
          this.whereClauses.push([`OR ${mainStr}`, newValues]);
        } else {
          throw new SQLError(
            "Provide a valid where clause first before using OR"
          );
        }
        break;
      }
    }
  }

  protected joinClauses: [[string, false | number], any[]][] = [];
}

// join
export class JoinInterpolator extends WhereInterpolator {
  private fromTable: string = "";
  private myTable: string = "";
  protected override fromJoin = true;
  public on(...args: [string, WhereOperator, string]): this {
    if (args.length !== 3) {
      throw new SQLError("Invalid ON clause for JOIN");
    }
    this.joinClauses.push([[`${args[0]} ${args[1]} ${args[2]}`, false], []]);
    return this;
  }

  protected getJoinClauseAndJoinValues(): [string, any[]] {
    const whereClauses = this.getWhereClauses();
    const newWhereClauses: string[][] = [];
    const newWhereValues: WhereValue[] = [];
    if (!empty(whereClauses)) {
      whereClauses.forEach(([clause, values]) => {
        newWhereClauses.push([clause]);
        newWhereValues.push(...values);
      });
    }
    // Map whereClauses to the expected type for joinClauses
    const mappedWhereClauses: [[string, false | number], any[]][] =
      whereClauses.map(([clause, values]) => [[clause, false], values]);
    const joinClause = this.joinClauses
      .concat(mappedWhereClauses)
      .map(([clause]) => {
        return clause[0];
      })
      .join(" ");
    return [joinClause, newWhereValues];
  }

  protected setFromTable(table: string): void {
    if (!isString(table) || empty(table)) {
      throw new SQLError("Invalid table name for JOIN");
    }
    this.fromTable = table;
  }

  protected setMyTable(table: string): void {
    if (!isString(table) || empty(table)) {
      throw new SQLError("Invalid table name for JOIN");
    }
    this.myTable = table;
  }

  public using(...arg: string[]): this {
    if (!arg.length) {
      throw new SQLError("Using requires at least one column name");
    }
    arg.forEach((col) => {
      if (!isString(col) || empty(col)) {
        throw new SQLError("Invalid column name for USING");
      }
      this.on(
        `ON ${arrayLast(this.fromTable.split(" "))}.${col}`,
        "=",
        `${arrayLast(this.myTable.split(" "))}.${col}`
      );
    });
    return this;
  }
}

export class Builder extends WhereInterpolator {
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private orderByValue: Record<string, OrderByDirection>[] = [];
  private groupByValue: string[] = [];
  #bindings: Record<string, WhereValue[]> = {};
  #params: WherePrimitive[] = [];
  #sql: string = "";
  private fields: Array<[string, false | number]>;
  private table: [string, false | number];
  constructor(
    {
      table,
      fields = ["*"],
    }: {
      table: sqlstring;
      fields?: sqlstring[];
    },
    protected dbUsed: string = DB.getDefaultConnection()
  ) {
    super(dbUsed);
    this.table = this.extract(table);
    this.fields = fields.map((field) => this.extract(field));
  }

  public select(...fields: sqlstring[]): this {
    if (empty(fields)) {
      throw new SQLError("Select requires at least one field");
    }
    this.fields = fields.map((field) => this.extract(field));
    return this;
  }

  // join
  public join(
    table: sqlstring,
    callback: (join: JoinInterpolator) => void
  ): this;
  public join(
    table: sqlstring,
    first: string,
    operator: WhereOperator,
    second: string
  ): this;
  public join(table: string, first: string, second: string): this;
  public join(
    ...args: [
      sqlstring,
      string | ((join: JoinInterpolator) => void),
      (string | WhereOperator)?,
      string?,
    ]
  ): this {
    const joinT = this.#returnJoinRaw("INNER", ...args);
    if (joinT === false) {
      // to be implemented
      this.processJoin(
        "INNER",
        args[0],
        args[1] as (join: JoinInterpolator) => void
      );
    } else {
      this.joinClauses.push([joinT, []]);
    }

    return this;
  }

  public leftJoin(
    table: string,
    callback: (join: JoinInterpolator) => void
  ): this;
  public leftJoin(
    table: string,
    first: string,
    operator: WhereOperator,
    second: string
  ): this;
  public leftJoin(table: string, first: string, second: string): this;
  public leftJoin(
    ...args: [
      string,
      string | ((join: JoinInterpolator) => void),
      (string | WhereOperator)?,
      string?,
    ]
  ): this {
    const joinT = this.#returnJoinRaw("LEFT", ...args);
    if (joinT === false) {
      // to be implemented
      this.processJoin(
        "LEFT",
        args[0],
        args[1] as (join: JoinInterpolator) => void
      );
    } else {
      this.joinClauses.push([joinT, []]);
    }
    return this;
  }

  public rightJoin(
    table: string,
    callback: (join: JoinInterpolator) => void
  ): this;
  public rightJoin(
    table: string,
    first: string,
    operator: WhereOperator,
    second: string
  ): this;
  public rightJoin(table: string, first: string, second: string): this;
  public rightJoin(
    ...args: [
      string,
      string | ((join: JoinInterpolator) => void),
      (string | WhereOperator)?,
      string?,
    ]
  ): this {
    const joinT = this.#returnJoinRaw("RIGHT", ...args);
    if (joinT === false) {
      // to be implemented
      this.processJoin(
        "RIGHT",
        args[0],
        args[1] as (join: JoinInterpolator) => void
      );
    } else {
      this.joinClauses.push([joinT, []]);
    }
    return this;
  }

  public fullJoin(
    table: string,
    callback: (join: JoinInterpolator) => void
  ): this;
  public fullJoin(
    table: string,
    first: string,
    operator: WhereOperator,
    second: string
  ): this;
  public fullJoin(table: string, first: string, second: string): this;
  public fullJoin(
    ...args: [
      string,
      string | ((join: JoinInterpolator) => void),
      (string | WhereOperator)?,
      string?,
    ]
  ): this {
    const joinT = this.#returnJoinRaw("FULL", ...args);
    if (joinT === false) {
      // to be implemented
      this.processJoin(
        "FULL",
        args[0],
        args[1] as (join: JoinInterpolator) => void
      );
    } else {
      this.joinClauses.push([joinT, []]);
    }
    return this;
  }

  public crossJoin(table: sqlstring): this {
    const [myNewTable, isRaw] = this.extract(table);
    this.joinClauses.push([[`CROSS JOIN ${myNewTable}`, isRaw], []]);
    return this;
  }

  private processJoin(
    type: JoinType,
    table: sqlstring,
    fn: (join: JoinInterpolator) => void
  ): void {
    const [myNewTable, isRaw] = this.extract(table);
    if (!isFunction(fn)) {
      throw new SQLError("Join callback must be a function");
    }
    const join = new JoinInterpolator(this.dbUsed);
    // @ts-ignore //
    join.setMyTable(myNewTable);
    // @ts-ignore //
    join.setFromTable(arrayLast(this.table[0].split(" "))!); // Extract table name from the full table string

    fn(join);
    // @ts-ignore //
    const [joinClause, joinValues] = join.getJoinClauseAndJoinValues();
    this.joinClauses.push([
      [`${type} JOIN ${myNewTable} ON ${joinClause}`, isRaw],
      joinValues,
    ]);
  }

  private processJoinSub(
    subQuery: Builder,
    type: JoinType,
    table: string,
    fn: (join: JoinInterpolator) => void
  ): void {
    if (!(subQuery instanceof Builder)) {
      throw new SQLError("subQuery must be an instance of Builder");
    }
    const [initTable, isRaw] = this.extract(subQuery);
    const myNewTable = `${initTable} AS ${table}`;
    if (!isFunction(fn)) {
      throw new SQLError("Join callback must be a function");
    }
    const join = new JoinInterpolator(this.dbUsed);
    // @ts-ignore //
    join.setMyTable(myNewTable);
    // @ts-ignore //
    join.setFromTable(arrayLast(this.table[0].split(" "))!);

    fn(join);
    // @ts-ignore //
    const [joinClause, joinValues] = join.getJoinClauseAndJoinValues();
    this.joinClauses.push([
      [`${type} JOIN ${myNewTable} ON ${joinClause}`, isRaw],
      joinValues,
    ]);
  }

  public joinSub(
    subQuery: Builder,
    table: string,
    callback: (join: JoinInterpolator) => void
  ): this;
  public joinSub(
    subQuery: Builder,
    table: string,
    first: string,
    operator: WhereOperator,
    second: string
  ): this;
  public joinSub(
    subQuery: Builder,
    table: string,
    first: string,
    second: string
  ): this;

  public joinSub(
    subQuery: Builder,
    ...args: [
      string,
      string | ((join: JoinInterpolator) => void),
      (string | WhereOperator)?,
      string?,
    ]
  ): this {
    if (!(subQuery instanceof Builder)) {
      throw new SQLError("subQuery must be an instance of Builder");
    }
    const returnedJoin = this.#returnJoinRawSub(subQuery, "INNER", ...args);
    if (returnedJoin === false) {
      // to be implemented
      this.processJoinSub(
        subQuery,
        "INNER",
        args[0],
        args[1] as (join: JoinInterpolator) => void
      );
    } else {
      this.joinClauses.push([returnedJoin, []]);
    }

    return this;
  }

  public rightJoinSub(
    subQuery: Builder,
    table: string,
    callback: (join: JoinInterpolator) => void
  ): this;
  public rightJoinSub(
    subQuery: Builder,
    table: string,
    first: string,
    operator: WhereOperator,
    second: string
  ): this;
  public rightJoinSub(
    subQuery: Builder,
    table: string,
    first: string,
    second: string
  ): this;

  public rightJoinSub(
    subQuery: Builder,
    ...args: [
      string,
      string | ((join: JoinInterpolator) => void),
      (string | WhereOperator)?,
      string?,
    ]
  ): this {
    if (!(subQuery instanceof Builder)) {
      throw new SQLError("subQuery must be an instance of Builder");
    }
    const returnedJoin = this.#returnJoinRawSub(subQuery, "RIGHT", ...args);
    if (returnedJoin === false) {
      // to be implemented
      this.processJoinSub(
        subQuery,
        "RIGHT",
        args[0],
        args[1] as (join: JoinInterpolator) => void
      );
    } else {
      this.joinClauses.push([returnedJoin, []]);
    }

    return this;
  }

  public leftJoinSub(
    subQuery: Builder,
    table: string,
    callback: (join: JoinInterpolator) => void
  ): this;
  public leftJoinSub(
    subQuery: Builder,
    table: string,
    first: string,
    operator: WhereOperator,
    second: string
  ): this;
  public leftJoinSub(
    subQuery: Builder,
    table: string,
    first: string,
    second: string
  ): this;

  public leftJoinSub(
    subQuery: Builder,
    ...args: [
      string,
      string | ((join: JoinInterpolator) => void),
      (string | WhereOperator)?,
      string?,
    ]
  ): this {
    if (!(subQuery instanceof Builder)) {
      throw new SQLError("subQuery must be an instance of Builder");
    }
    const returnedJoin = this.#returnJoinRawSub(subQuery, "LEFT", ...args);
    if (returnedJoin === false) {
      // to be implemented
      this.processJoinSub(
        subQuery,
        "LEFT",
        args[0],
        args[1] as (join: JoinInterpolator) => void
      );
    } else {
      this.joinClauses.push([returnedJoin, []]);
    }

    return this;
  }

  public fullJoinSub(
    subQuery: Builder,
    table: string,
    callback: (join: JoinInterpolator) => void
  ): this;
  public fullJoinSub(
    subQuery: Builder,
    table: string,
    first: string,
    operator: WhereOperator,
    second: string
  ): this;
  public fullJoinSub(
    subQuery: Builder,
    table: string,
    first: string,
    second: string
  ): this;

  public fullJoinSub(
    subQuery: Builder,
    ...args: [
      string,
      string | ((join: JoinInterpolator) => void),
      (string | WhereOperator)?,
      string?,
    ]
  ): this {
    if (!(subQuery instanceof Builder)) {
      throw new SQLError("subQuery must be an instance of Builder");
    }
    const returnedJoin = this.#returnJoinRawSub(subQuery, "FULL", ...args);
    if (returnedJoin === false) {
      // to be implemented
      this.processJoinSub(
        subQuery,
        "FULL",
        args[0],
        args[1] as (join: JoinInterpolator) => void
      );
    } else {
      this.joinClauses.push([returnedJoin, []]);
    }

    return this;
  }

  public limit(value: number): this {
    if (!isInteger(value) || value < 0) {
      throw new SQLError("Limit must be a non-negative number");
    }
    this.limitValue = value;
    return this;
  }

  public offset(value: number): this {
    if (!isInteger(value) || value < 0) {
      throw new SQLError("Offset must be a non-negative number");
    }
    this.offsetValue = value;
    return this;
  }

  public orderBy(column: string, direction: OrderByDirection = "ASC"): this {
    if (!isString(column) || empty(column)) {
      throw new SQLError("Invalid column name for orderBy");
    }
    if (!["ASC", "DESC"].includes(direction.toUpperCase())) {
      throw new SQLError("Invalid order direction");
    }
    this.orderByValue.push({ [column]: direction });
    return this;
  }

  public groupBy(...columns: string[]): this {
    if (!isArray(columns) || columns.length === 0) {
      throw new SQLError("Group by requires at least one column");
    }
    for (const column of columns) {
      if (!isString(column) || empty(column)) {
        throw new SQLError("Invalid column name for groupBy");
      }
      this.groupByValue.push(column);
    }
    return this;
  }

  private indexes = {
    useIndex: [] as string[],
    ignoreIndex: [] as string[],
    forceIndex: [] as string[],
  };

  /**
   * Adds USE INDEX hint to the query.
   */
  public useIndex(...indexes: string[]): this {
    this.indexes.useIndex.push(...indexes);
    return this;
  }

  /**
   * Adds IGNORE INDEX hint to the query.
   */
  public ignoreIndex(...indexes: string[]): this {
    this.indexes.ignoreIndex.push(...indexes);
    return this;
  }

  /**
   * Adds FORCE INDEX hint to the query.
   */
  public forceIndex(...indexes: string[]): this {
    this.indexes.forceIndex.push(...indexes);
    return this;
  }

  /**
   * Build the index hint part of the SQL.
   */
  private buildIndexHint(): string {
    const parts: string[] = [];

    if (this.indexes.useIndex.length > 0) {
      parts.push(`USE INDEX (${this.indexes.useIndex.join(", ")})`);
    }

    if (this.indexes.ignoreIndex.length > 0) {
      parts.push(`IGNORE INDEX (${this.indexes.ignoreIndex.join(", ")})`);
    }

    if (this.indexes.forceIndex.length > 0) {
      parts.push(`FORCE INDEX (${this.indexes.forceIndex.join(", ")})`);
    }

    return parts.join(" ");
  }

  /**
   * Build the FROM clause with index hints.
   */
  private buildFromClause(): string {
    const indexHint = this.buildIndexHint();
    if (this.table[1]) {
      this.#inputParams(this.table[1]);
    }
    return `FROM ${this.table[0]}${indexHint ? " " + indexHint : ""}`;
  }

  #inputParams(id: number) {
    if (keyExist(this.#bindings, id)) {
      this.#params.push(...this.#bindings[id]);
    }
  }

  #built: boolean = false;
  private toSqlWithValues(type: string = "select") {
    if (this.#built) {
      return;
    }
    const field = this.fields;
    const joins = this.joinClauses;
    const where = this.whereClauses;
    const groupBy = this.groupByValue;
    const having = this.havingClauses;
    const orderBy = this.orderByValue;
    const offset = this.offsetValue;
    const limit = this.limitValue;

    let sql;
    if (type === "insert") {
      sql = "INSERT INTO";
    } else if (type === "delete") {
      sql = "DELETE";
    } else {
      sql = "SELECT";
    }
    const fieldStr: string[] = [];
    field.forEach(([str, bool]) => {
      if (bool) {
        this.#inputParams(bool);
      }
      fieldStr.push(str);
    });
    if (type === "select") {
      sql += ` ${fieldStr.join(", ")}`;
    }
    sql += ` ${this.buildFromClause()}`;
    if (joins.length > 0) {
      sql +=
        " " +
        joins
          .map(([[clause, bool], val]) => {
            if (bool) {
              this.#inputParams(bool);
            }
            this.#params.push(...val);
            return clause;
          })
          .join(" ");
    }
    if (where.length > 0) {
      sql +=
        " WHERE " +
        where
          .map(([clause, val]) => {
            this.#params.push(...val);
            return clause;
          })
          .join(" ");
    }
    if (groupBy.length > 0) {
      sql += " GROUP BY " + groupBy.join(", ");
    }
    if (having.length > 0) {
      if (groupBy.length === 0) {
        throw new SQLError("HAVING clause requires a GROUP BY clause");
      }
      sql +=
        " HAVING " +
        having
          .map(([clause, val]) => {
            this.#params.push(...val);
            return clause;
          })
          .join(" ");
    }
    if (orderBy.length > 0) {
      sql +=
        " ORDER BY " +
        orderBy
          .map((order) => {
            const column = Object.keys(order)[0];
            const direction = order[column];
            return `${column} ${direction}`;
          })
          .join(", ");
    }
    if (offset !== null) {
      sql += ` OFFSET ?`;
      this.#params.push(offset);
    }
    if (limit !== null) {
      sql += ` LIMIT ?`;
      this.#params.push(limit);
    }

    this.#sql = sql;
    this.#built = true;
  }

  public toSql() {
    this.toSqlWithValues();
    return this.#sql;
  }

  public getBindings() {
    this.toSqlWithValues();
    return this.#params;
  }

  public async get() {
    const { sql, values } = {
      sql: this.toSql(),
      values: this.getBindings(),
    };
    const result = await this.database.runQuery<"select">(sql, values);
    return result;
  }

  public async first() {
    this.limit(1);
    const { sql, values } = {
      sql: this.toSql(),
      values: this.getBindings(),
    };
    const result = await this.database.runQuery<"select">(sql, values);
    return result[0] || null;
  }

  public async count(): Promise<number> {
    this.select(DB.raw("COUNT(*) AS count"));
    const { sql, values } = {
      sql: this.toSql(),
      values: this.getBindings(),
    };
    const result = await this.database.runQuery<"select">(sql, values);
    return Number(result[0]?.count || 0);
  }

  public async delete() {
    this.toSqlWithValues("delete");
    const { sql, values } = {
      sql: this.#sql,
      values: this.#params,
    };
    const result = await this.database.runQuery<"delete">(sql, values);
    return result;
  }

  public mergeBindings(param: Builder): this {
    if (!(param instanceof Builder)) {
      throw new SQLError("Invalid parameter for mergeBindings");
    }
    const lastId = this.#bindingId;
    this.#bindings[lastId] = param.getBindings();
    return this;
  }

  #bindingId = 0;

  private extract(arg: sqlstring): [string, false | number] {
    if (arg instanceof SQLRaw) {
      this.#bindingId++;
      return [arg.toString(), this.#bindingId];
    } else if (isString(arg)) {
      return [arg, false];
    } else if (arg instanceof Builder) {
      this.#bindingId++;
      const { sql } = {
        sql: arg.toSql(),
      };
      this.mergeBindings(arg);
      return [`(${sql})`, this.#bindingId];
    } else {
      throw new SQLError("Invalid SQL string or Builder instance");
    }
  }

  public async insert(...data: Record<string, unknown>[]) {
    const [sql, values] = this.insertBuilder({
      table: this.table[0],
      data,
    });
    const result = await this.database.runQuery<"insert">(sql, [...values]);
    return result;
  }

  private insertBuilder(input: TInsertBuilder): [string, unknown[]] {
    if (!isArray(input.data) || input.data.length === 0) {
      throw new Error("Insert data must be a non-empty array.");
    }

    let columns = Object.keys(input.data[0]);
    const rows = input.data;

    const placeholders = rows
      .map(() => `(${columns.map(() => "?").join(", ")})`)
      .join(", ");

    const values = rows.flatMap((row) =>
      columns.map((col) => row[col] || null)
    );

    const db = this.database;
    columns = columns.map((col) => db.quoteIdentifier(col));
    let sql = `INSERT INTO ${input.table} (${columns.join(
      ", "
    )}) VALUES ${placeholders}`;

    if (this.dbUsed === "pgsql") {
      sql += " RETURNING *";
    }

    return [sql, values];
  }

  #returnJoinRaw(
    type: JoinType,
    ...args: [
      sqlstring,
      string | ((join: JoinInterpolator) => void),
      (string | WhereOperator)?,
      string?,
    ]
  ): [string, false | number] | false {
    const [table, firstOrFn, operatorOrSecond, second] = args;
    const [newTable, isRaw] = this.extract(table);
    const newArgs = [newTable, firstOrFn, operatorOrSecond, second];

    if (newArgs.every((arg) => isString(arg))) {
      if (newArgs.length < 3 || newArgs.length > 4)
        throw new SQLError("Invalid join clause");
      let column1: string | undefined = undefined;
      let column2: string | undefined = undefined;
      let operator: WhereOperator = "=";
      if (newArgs.length === 4) {
        column1 = firstOrFn as string;
        column2 = second as string;
        operator = operatorOrSecond as WhereOperator;
      } else if (newArgs.length === 3) {
        column1 = firstOrFn as string;
        column2 = operatorOrSecond as string;
      }
      if (!isset(column1) || !isset(column2)) {
        throw new SQLError("Invalid join clause");
      }
      return [
        `${type} JOIN ${newTable} ON ${column1} ${operator} ${column2}`,
        isRaw,
      ];
    }

    return false;
  }

  #returnJoinRawSub(
    subQuery: Builder,
    type: JoinType,
    ...args: [
      sqlstring,
      string | ((join: JoinInterpolator) => void),
      (string | WhereOperator)?,
      string?,
    ]
  ): [string, false | number] | false {
    const [table, firstOrFn, operatorOrSecond, second] = args;
    if (!isString(table)) throw new SQLError("Alias must be a string");
    if (args.every((arg) => isString(arg))) {
      const [initNewTable, isRaw] = this.extract(subQuery);
      const newTable = `(${initNewTable}) AS ${table}`;
      const newArgs = [newTable, firstOrFn, operatorOrSecond, second];
      if (newArgs.length < 3 || newArgs.length > 4)
        throw new SQLError("Invalid join clause");
      let column1: string | undefined = undefined;
      let column2: string | undefined = undefined;
      let operator: WhereOperator = "=";
      if (newArgs.length === 4) {
        column1 = firstOrFn as string;
        column2 = second as string;
        operator = operatorOrSecond as WhereOperator;
      } else if (newArgs.length === 3) {
        column1 = firstOrFn as string;
        column2 = operatorOrSecond as string;
      }
      if (!isset(column1) || !isset(column2)) {
        throw new SQLError("Invalid join clause");
      }
      return [
        `${type} JOIN ${newTable} ON ${column1} ${operator} ${column2}`,
        isRaw,
      ];
    }

    return false;
  }

  private havingClauses: [string, WhereValue][] = [];
  /**
   * Adds a HAVING clause to the query.
   *
   * This is used to filter grouped results based on aggregate values.
   * It should be used in conjunction with GROUP BY and aggregate functions
   * like COUNT, SUM, AVG, etc.
   *
   * @param column - The name of the aggregated column or alias to compare.
   * @param operator - The comparison operator (e.g., '=', '>', '<=', etc.).
   * @param value - The value to compare against.
   *
   * @example
   *   .having('total_orders', '>', 5)
   */
  public having(column: string, value: WhereValue): this;
  public having(
    column: string,
    operator: HavingOperator,
    value: WhereValue
  ): this;
  public having(
    column: string,
    operatorOrValue: HavingOperator | WhereValue,
    maybeValue?: WhereValue
  ): this {
    let operator: HavingOperator = "=";
    let value: WhereValue;

    if (maybeValue !== undefined) {
      operator = operatorOrValue;
      value = maybeValue;
    } else {
      value = operatorOrValue;
    }
    this.processHaving("AND", column, operator, value);
    return this;
  }

  // Or
  /**
   * Adds an OR HAVING clause to the query.
   * This is used to filter grouped results based on aggregate values.
   * It should be used in conjunction with GROUP BY and aggregate functions
   * like COUNT, SUM, AVG, etc.
   * @param column - The name of the aggregated column or alias to compare.
   * @param operator - The comparison operator (e.g., '=', '>', '<=', etc.).
   * @param value - The value to compare against.
   */

  public orHaving(column: string, value: WhereValue): this;
  public orHaving(
    column: string,
    operator: HavingOperator,
    value: WhereValue
  ): this;
  public orHaving(
    column: string,
    operatorOrValue: HavingOperator | WhereValue,
    maybeValue?: WhereValue
  ): this {
    let operator: HavingOperator = "=";
    let value: WhereValue;
    if (maybeValue !== undefined) {
      operator = operatorOrValue;
      value = maybeValue;
    } else {
      value = operatorOrValue;
    }

    if (this.havingClauses.length === 0) {
      throw new SQLError("Provide a valid HAVING clause first before using OR");
    }

    this.processHaving("OR", column, operator, value);
    return this;
  }

  private processHaving(
    type: "AND" | "OR",
    column: string,
    operator: HavingOperator,
    value: WhereValue
  ): void {
    const db = this.database;
    column = db.quoteIdentifier(column);
    const clause = `${column} ${operator} ?`;
    const values: WhereValue[] = [value];
    if (this.havingClauses.length > 0) {
      this.havingClauses.push([`${type} ${clause}`, values]);
    } else {
      this.havingClauses.push([clause, values]);
    }
  }
}
type HavingOperator =
  | "="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "LIKE"
  | "NOT LIKE";
