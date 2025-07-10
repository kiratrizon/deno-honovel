// TypeScript version of Laravel-like Blueprint schema builder

export type ColumnType =
  | "string"
  | "text"
  | "integer"
  | "boolean"
  | "timestamp"
  | "foreignId"
  | "id"; // ✅ Add this

export interface ColumnOptions {
  length?: number;
  nullable?: boolean;
  default?: unknown;
  unique?: boolean;
  references?: string;
  on?: string;
  primary?: boolean; // For id() method
  autoIncrement?: boolean; // For id() method
}

export interface ColumnDefinition {
  type: ColumnType;
  name: string;
  options?: ColumnOptions;
}

export type DBType = "mysql" | "sqlite" | "pgsql" | "sqlsrv";

export interface TableSchema {
  table: string;
  columns: ColumnDefinition[];
  drops?: string[];
}

export class Blueprint {
  private table: string;
  private columns: ColumnDefinition[] = [];
  private drops: string[] = [];

  constructor(table: string) {
    this.table = table;
  }

  id(name = "id") {
    this.columns.push({
      type: "integer", // or "bigint"
      name,
      options: {
        primary: true,
        autoIncrement: true,
      },
    });
    return this;
  }

  primary() {
    this.lastColumn()!.options!.primary = true;
    return this;
  }

  autoIncrement() {
    this.lastColumn()!.options!.autoIncrement = true;
    return this;
  }

  string(name: string, length = 255) {
    this.columns.push({ type: "string", name, options: { length } });
    return this;
  }

  text(name: string) {
    this.columns.push({ type: "text", name });
    return this;
  }

  integer(name: string) {
    this.columns.push({ type: "integer", name });
    return this;
  }

  boolean(name: string) {
    this.columns.push({ type: "boolean", name });
    return this;
  }

  timestamp(name: string, options?: ColumnOptions) {
    this.columns.push({ type: "timestamp", name, options });
    return this;
  }

  timestamps() {
    const dbType = staticConfig("database").default || "mysql";

    const createdAtOptions: ColumnOptions = {};
    const updatedAtOptions: ColumnOptions = { nullable: true };

    if (dbType === "sqlite") {
      createdAtOptions.default = "CURRENT_TIMESTAMP";
      updatedAtOptions.default = "CURRENT_TIMESTAMP";
    } else if (dbType === "mysql") {
      createdAtOptions.default = "CURRENT_TIMESTAMP";
      updatedAtOptions.default =
        "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"; // leave ON UPDATE to be handled in SQL generator
    } else if (dbType === "pgsql" || dbType === "sqlsrv") {
      createdAtOptions.default = "CURRENT_TIMESTAMP";
      updatedAtOptions.default = "CURRENT_TIMESTAMP";
    }

    this.timestamp("created_at", createdAtOptions);
    this.timestamp("updated_at", updatedAtOptions);

    return this;
  }

  foreignId(name: string) {
    this.columns.push({ type: "foreignId", name });
    return this;
  }

  nullable() {
    this.lastColumn()!.options!.nullable = true;
    return this;
  }

  notNullable() {
    this.lastColumn()!.options!.nullable = false;
    return this;
  }

  default(value: unknown) {
    this.lastColumn()!.options!.default = value;
    return this;
  }

  unique() {
    this.lastColumn()!.options!.unique = true;
    return this;
  }

  references(column: string) {
    this.lastColumn()!.options!.references = column;
    return this;
  }

  on(table: string) {
    this.lastColumn()!.options!.on = table;
    return this;
  }

  dropColumn(name: string) {
    this.drops.push(name);
    return this;
  }

  getColumns(): ColumnDefinition[] {
    return this.columns;
  }

  getDroppedColumns(): string[] {
    return this.drops;
  }

  private lastColumn(): ColumnDefinition | undefined {
    const column = this.columns[this.columns.length - 1];
    if (!column) {
      throw new Error("No column defined yet.");
    }
    return column;
  }
}
