type WherePrimitive = string | number | boolean | null;
type WhereValue = WherePrimitive | WherePrimitive[];
type WhereOperator =
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
type WhereClause = string;
const placeHolderuse: string = "?";

type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL" | "CROSS";

type WhereSeparator = "AND" | "OR";

// where
class WhereInterpolator {
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
      WherePrimitive?
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
      WherePrimitive?
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
      WherePrimitive?
    ]
  ): void {
    const [columnOrFn, operatorOrValue, valueArg] = args;
    if (isFunction(columnOrFn)) {
      // to handle callback
      const qb = new WhereInterpolator();
      columnOrFn(qb);
      const getWhere = qb.getWhereClauses();
      const callbackClause: string[] = [];
      const callbackValues: WhereValue[] = [];
      getWhere.forEach(([clause, values]) => {
        callbackClause.push(clause);
        callbackValues.push(...values);
      });
      if (type === "AND") {
        if (this.whereClauseFilled()) {
          this.whereClauses.push([
            `AND (${callbackClause.join(" ")})`,
            callbackValues,
          ]);
        } else {
          this.whereClauses.push([
            `(${callbackClause.join(" ")})`,
            callbackValues,
          ]);
        }
      } else if (type === "OR") {
        if (this.whereClauseFilled()) {
          this.whereClauses.push([
            `OR (${callbackClause.join(" ")})`,
            callbackValues,
          ]);
        } else {
          throw new SQLError(
            "Provide a valid where clause first before using OR"
          );
        }
      }
      return;
    }
    let column: string;
    let value: WherePrimitive;
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

    if (!isset(placeHolderuse)) {
      throw new SQLError("Unsupported database type for placeholder");
    }
    if (type === "AND") {
      if (this.whereClauseFilled()) {
        this.whereClauses.push([
          `AND ${column} ${operator} ${placeHolderuse}`,
          [value],
        ]);
      } else {
        this.whereClauses.push([
          `${column} ${operator} ${placeHolderuse}`,
          [value],
        ]);
      }
    } else {
      if (this.whereClauseFilled()) {
        this.whereClauses.push([
          `OR ${column} ${operator} ${placeHolderuse}`,
          [value],
        ]);
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
    values: WherePrimitive[]
  ): void {
    if (!isArray(values)) {
      throw new SQLError("Values for whereIn must be an array");
    }
    if (values.length === 0) {
      throw new SQLError("Values for whereIn cannot be empty");
    }
    const dbType = env(
      "DB_CONNECTION",
      empty(env("DENO_DEPLOYMENT_ID")) ? "sqlite" : "mysql"
    );
    switch (type) {
      case "AND": {
        if (this.whereClauseFilled()) {
          this.whereClauses.push([
            `AND ${column} ${operator} (${values
              .map(() => placeHolderuse)
              .join(", ")})`,
            values,
          ]);
        } else {
          this.whereClauses.push([
            `${column} ${operator} (${values
              .map(() => placeHolderuse)
              .join(", ")})`,
            values,
          ]);
        }
        break;
      }
      case "OR": {
        if (this.whereClauseFilled()) {
          this.whereClauses.push([
            `OR ${column} ${operator} (${values
              .map(() => placeHolderuse)
              .join(", ")})`,
            values,
          ]);
        } else {
          throw new SQLError(
            "Provide a valid where clause first before using OR"
          );
        }
        break;
      }
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
    switch (type) {
      case "AND": {
        if (this.whereClauseFilled()) {
          this.whereClauses.push([`AND ${column} ${operator}`, []]);
        } else {
          this.whereClauses.push([`${column} ${operator}`, []]);
        }
        break;
      }
      case "OR": {
        if (this.whereClauseFilled()) {
          this.whereClauses.push([`OR ${column} ${operator}`, []]);
        } else {
          throw new SQLError(
            "Provide a valid where clause first before using OR"
          );
        }
        break;
      }
    }
  }

  public whereBetween(
    column: string,
    values: [WherePrimitive, WherePrimitive]
  ): this {
    this.whereBetweenProcess("BETWEEN", "AND", column, values);
    return this;
  }

  public whereNotBetween(
    column: string,
    values: [WherePrimitive, WherePrimitive]
  ): this {
    this.whereBetweenProcess("NOT BETWEEN", "AND", column, values);
    return this;
  }

  public orWhereBetween(
    column: string,
    values: [WherePrimitive, WherePrimitive]
  ): this {
    this.whereBetweenProcess("BETWEEN", "OR", column, values);
    return this;
  }

  public orWhereNotBetween(
    column: string,
    values: [WherePrimitive, WherePrimitive]
  ): this {
    this.whereBetweenProcess("NOT BETWEEN", "OR", column, values);
    return this;
  }

  private whereBetweenProcess(
    operator: "BETWEEN" | "NOT BETWEEN",
    type: WhereSeparator,
    column: string,
    values: [WherePrimitive, WherePrimitive]
  ): void {
    if (!isArray(values) || values.length !== 2) {
      throw new SQLError(
        "Values for whereBetween must be an array of two elements"
      );
    }

    const [start, end] = values;
    if (!isset(start) || !isset(end)) {
      throw new SQLError("Both start and end values must be provided");
    }
    switch (type) {
      case "AND": {
        if (this.whereClauseFilled()) {
          this.whereClauses.push([
            `AND ${column} ${operator} ${placeHolderuse} AND ${placeHolderuse}`,
            [start, end],
          ]);
        } else {
          this.whereClauses.push([
            `${column} ${operator} ${placeHolderuse} AND ${placeHolderuse}`,
            [start, end],
          ]);
        }
        break;
      }
      case "OR": {
        if (this.whereClauseFilled()) {
          this.whereClauses.push([
            `OR ${column} ${operator} ${placeHolderuse} AND ${placeHolderuse}`,
            [start, end],
          ]);
        } else {
          throw new SQLError(
            "Provide a valid where clause first before using OR"
          );
        }
        break;
      }
    }
  }

  protected joinClauses: [string, any[]][] = [];
}

// join
class JoinInterpolator extends WhereInterpolator {
  private fromTable: string = "";
  private myTable: string = "";
  protected override fromJoin = true;
  public on(...args: [string, WhereOperator, string]): this {
    if (args.length !== 3) {
      throw new SQLError("Invalid ON clause for JOIN");
    }
    this.joinClauses.push([`${args[0]} ${args[1]} ${args[2]}`, []]);
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
    const joinClause = this.joinClauses
      .concat(whereClauses)
      .map(([clause]) => clause)
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

type OrderByDirection = "ASC" | "DESC";
type SQLField = string;
export class Builder extends WhereInterpolator {
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private orderByValue: Record<string, OrderByDirection>[] = [];
  private groupByValue: string[] = [];
  private havingClauses: string[] = [];
  private havingValues: WhereValue[] = [];
  private fields: SQLField[];
  private table: string = "";
  constructor(table: string, fields: (SQLField | SQLRaw)[] = ["*"]) {
    super();
    if (!isString(table) || empty(table)) {
      throw new SQLError("Invalid table name");
    }
    this.table = table.trim();
    const newFields: SQLField[] = [];
    fields.forEach((field) => {
      if (field instanceof SQLRaw) {
        newFields.push(field.toString()); // Accept raw SQL directly
      } else if (isString(field)) {
        const length = field.split(" ").length;
        if (length === 1) {
          newFields.push(field);
        }
      }
    });
    this.fields = newFields;
  }

  // join
  public join(table: string, callback: (join: JoinInterpolator) => void): this;
  public join(
    table: string,
    first: string,
    operator: WhereOperator,
    second: string
  ): this;
  public join(table: string, first: string, second: string): this;
  public join(
    ...args: [
      string,
      string | ((join: JoinInterpolator) => void),
      (string | WhereOperator)?,
      string?
    ]
  ): this {
    const joinT = returnJoinRaw("INNER", ...args);
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
      string?
    ]
  ): this {
    const joinT = returnJoinRaw("LEFT", ...args);
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
      string?
    ]
  ): this {
    const joinT = returnJoinRaw("RIGHT", ...args);
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
      string?
    ]
  ): this {
    const joinT = returnJoinRaw("FULL", ...args);
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

  public crossJoin(table: string): this {
    if (!isString(table) || empty(table)) {
      throw new SQLError("Invalid table name for CROSS JOIN");
    }
    this.joinClauses.push([`CROSS JOIN ${table}`, []]);
    return this;
  }

  private processJoin(
    type: JoinType,
    table: string,
    fn: (join: JoinInterpolator) => void
  ): void {
    const myNewTable = table.trim();
    if (!isFunction(fn)) {
      throw new SQLError("Join callback must be a function");
    }
    const join = new JoinInterpolator();
    // @ts-ignore //
    join.setMyTable(myNewTable);
    // @ts-ignore //
    join.setFromTable(this.table);

    fn(join);
    // @ts-ignore //
    const [joinClause, joinValues] = join.getJoinClauseAndJoinValues();
    this.joinClauses.push([
      `${type} JOIN ${myNewTable} ON ${joinClause}`,
      joinValues,
    ]);
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
    if (!["ASC", "DESC"].includes(direction)) {
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
    return `FROM ${this.table}${indexHint ? " " + indexHint : ""}`;
  }

  private toSqlWithValues() {
    const field = this.fields;
    const joins = this.joinClauses;
    const where = this.whereClauses;
    const limit = this.limitValue;
    const offset = this.offsetValue;
    const orderBy = this.orderByValue;
    const groupBy = this.groupByValue;

    const values: unknown[] = [];
    let sql = `SELECT ${field.join(", ")} ${this.buildFromClause()}`;
    if (joins.length > 0) {
      sql +=
        " " +
        joins
          .map(([clause, val]) => {
            values.push(...val);
            return clause;
          })
          .join(" ");
    }
    if (where.length > 0) {
      sql +=
        " WHERE " +
        where
          .map(([clause, val]) => {
            values.push(...val);
            return clause;
          })
          .join(" ");
    }
    if (groupBy.length > 0) {
      sql += " GROUP BY " + groupBy.join(", ");
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
      sql += ` OFFSET ${offset}`;
    }
    if (limit !== null) {
      sql += ` LIMIT ${limit}`;
    }

    return {
      sql,
      values,
    };
  }

  public toSql() {
    return this.toSqlWithValues().sql;
  }

  public getBindings() {
    return this.toSqlWithValues().values;
  }
}

function returnJoinRaw(
  type: JoinType,
  ...args: [
    string,
    string | ((join: JoinInterpolator) => void),
    (string | WhereOperator)?,
    string?
  ]
): string | false {
  const [table, firstOrFn, operatorOrSecond, second] = args;
  if (args.every((arg) => isString(arg))) {
    if (args.length < 3 || args.length > 4)
      throw new SQLError("Invalid join clause");
    let column1: string | undefined = undefined;
    let column2: string | undefined = undefined;
    let operator: WhereOperator = "=";
    if (args.length === 4) {
      column1 = firstOrFn as string;
      column2 = second as string;
      operator = operatorOrSecond as WhereOperator;
    } else if (args.length === 3) {
      column1 = firstOrFn as string;
      column2 = operatorOrSecond as string;
    }
    if (!isset(column1) || !isset(column2)) {
      throw new SQLError("Invalid join clause");
    }
    return `${type} JOIN ${table} ON ${column1} ${operator} ${column2}`;
  }

  return false;
}

export class SQLError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class SQLRaw extends String {
  constructor(query: string) {
    super(query);
  }

  public needsBinding(): boolean {
    const query = this.toString();

    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < query.length; i++) {
      const char = query[i];
      const nextChar = query[i + 1];

      // Handle escaping
      if (char === "\\" && (nextChar === "'" || nextChar === '"')) {
        i++; // skip escaped char
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      // If outside quotes and see ?
      if (char === "?" && !inSingleQuote && !inDoubleQuote) {
        return true;
      }
    }

    return false;
  }
}
