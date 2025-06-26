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
  protected whereValues: WhereValue[] = [];
  protected whereClauses: [string, any[]][] = [];
  protected callbackWhereClauses: string[] = [];

  protected currentLengthValues: number = 0;
  constructor(currentLengthValues: number = 0) {
    this.currentLengthValues = currentLengthValues;
  }
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
      if (type === "AND") {
        getWhere.forEach(([clause, values]) => {
          if (this.whereClauses.length + this.joinClauses.length) {
            this.whereClauses.push([`AND (${clause})`, [...values]]);
          } else {
            this.whereClauses.push([`(${clause})`, [...values]]);
          }
        });
      } else if (type === "OR") {
        if (this.whereClauses.length + this.joinClauses.length) {
          getWhere.forEach(([clause, values]) => {
            this.whereClauses.push([`OR (${clause})`, [...values]]);
          });
        } else {
          throw new SQLError("Invalid where clause");
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
      if (this.whereClauses.length + this.joinClauses.length) {
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
      if (this.whereClauses.length + this.joinClauses.length) {
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
        if (this.whereClauses.length + this.joinClauses.length) {
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
        if (this.whereClauses.length + this.joinClauses.length) {
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
        if (this.whereClauses.length + this.joinClauses.length) {
          this.whereClauses.push([`AND ${column} ${operator}`, []]);
        } else {
          this.whereClauses.push([`${column} ${operator}`, []]);
        }
        break;
      }
      case "OR": {
        if (this.whereClauses.length + this.joinClauses.length) {
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
        if (this.whereClauses.length + this.joinClauses.length) {
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
        if (this.whereClauses.length + this.joinClauses.length) {
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
  constructor(currentLengthValues: number = 0) {
    super(currentLengthValues);
  }

  public on(...args: [string, WhereOperator, string]): this {
    if (args.length !== 3) {
      throw new SQLError("Invalid ON clause for JOIN");
    }
    this.joinClauses.push([`${args[0]} ${args[1]} ${args[2]}`, []]);
    return this;
  }

  protected getJoinClauseAndJoinValues(): [string, any[]][] {
    const whereClauses = this.getWhereClauses();
    return this.joinClauses.concat(whereClauses);
  }
}

type OrderByDirection = "ASC" | "DESC";

export class Builder extends WhereInterpolator {
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private orderByValue: Record<string, OrderByDirection>[] = [];
  private groupByValue: string[] = [];
  private havingClauses: string[] = [];
  private havingValues: WhereValue[] = [];
  constructor(private table: string, private fields: string[] = ["*"]) {
    super();
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
    if (!isFunction(fn)) {
      throw new SQLError("Join callback must be a function");
    }
    const join = new JoinInterpolator(this.currentLengthValues);
    fn(join);
    // @ts-ignore //
    const [joinClause, joinValues] = join.getJoinClauseAndJoinValues();
    this.joinClauses.push([
      `${type} JOIN ${table} ON ${joinClause}`,
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

  public toSql() {
    return true;
  }

  public toSqlWithValues() {
    const dataReturn: Record<string, unknown> = {
      table: this.table,
      fields: this.fields,
      where: this.whereClauses,
      joins: this.joinClauses,
      limit: this.limitValue,
      offset: this.offsetValue,
      orderBy: this.orderByValue,
      groupBy: this.groupByValue,
      having: this.havingClauses,
      havingValues: this.havingValues,
    };
    return dataReturn;
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
