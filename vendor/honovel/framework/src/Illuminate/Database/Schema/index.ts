// TypeScript version of Laravel-like Blueprint schema builder

export type ColumnType =
  | "string"       // VARCHAR
  | "text"         // TEXT
  | "tinyText"     // TINYTEXT
  | "mediumText"   // MEDIUMTEXT
  | "longText"     // LONGTEXT
  | "char"         // CHAR
  | "uuid"         // CHAR(36)
  | "integer"      // INT
  | "tinyint"      // TINYINT
  | "smallint"     // SMALLINT
  | "mediumint"    // MEDIUMINT
  | "bigint"       // BIGINT
  | "float"        // FLOAT
  | "double"       // DOUBLE
  | "decimal"      // DECIMAL
  | "boolean"      // BOOLEAN (TINYINT(1))
  | "date"         // DATE
  | "datetime"     // DATETIME
  | "timestamp"    // TIMESTAMP
  | "time"         // TIME
  | "year"         // YEAR
  | "json"         // JSON
  | "enum"         // ENUM
  | "set"          // SET
  | "binary"       // BINARY
  | "id"           // alias for unsigned BIGINT AUTO_INCREMENT PRIMARY
  | "foreignId";   // alias for unsigned BIGINT



export interface ColumnOptions {
  length?: number;
  scale?: number; // For decimal types
  nullable?: boolean;
  default?: string | number | boolean | null; // For string, integer, boolean types
  unique?: boolean;
  references?: string;
  on?: string;
  primary?: boolean; // For id() method
  autoIncrement?: boolean; // For id() method
  unsigned?: boolean;
  comment?: string;
  change?: boolean; // For changing existing columns
  // Add any other options you need
  index?: string; // For creating indexes
  after?: string; // For specifying the order of columns
  first?: boolean; // For placing the column first
  invisible?: boolean; // For making the column invisible
  charset?: string; // For specifying character set
  collation?: string; // For specifying collation
  foreign?: string; // For foreign key constraints
  onDelete?: string; // For specifying on delete action
  onUpdate?: string; // For specifying on update action
  precision?: number; // For datetime, timestamp, time types
  allowed?: string[]; // For enum types
}

export interface ColumnDefinition {
  type: ColumnType;
  name: string;
  options: ColumnOptions;
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
  private columnCount: number = 0;

  constructor(table: string) {
    this.table = table;
  }
  /**
   * Provides chainable column option modifiers for a specific column definition.
   * Mimics Laravel's fluent column syntax (e.g., `->nullable()->default('foo')`).
   *
   * @param column - The column to apply options to.
   * @returns A chainable object with column configuration methods.
   */
  private optionsSelector(column: ColumnDefinition) {
    return {
      /**
       * Adds an index to the column.
       *
       * @param name - Optional custom index name.
       */
      index: (name?: string) => {
        column.options.index = name || `index_${column.name}`;
        return this.optionsSelector(column);
      },

      /**
       * Sets the column as the primary key.
       */
      primary: () => {
        column.options.primary = true;
        return this.optionsSelector(column);
      },

      /**
       * Marks the column to auto-increment.
       */
      autoIncrement: () => {
        column.options.autoIncrement = true;
        return this.optionsSelector(column);
      },

      /**
       * Places the column after the specified existing column.
       *
       * @param columnName - The name of the column to appear after.
       */
      after: (columnName: string) => {
        column.options.after = columnName;
        return this.optionsSelector(column);
      },

      /**
       * Places the column at the beginning of the table.
       */
      first: () => {
        column.options.first = true;
        return this.optionsSelector(column);
      },

      /**
       * Makes the column invisible in result sets (MySQL-specific).
       */
      invisible: () => {
        column.options.invisible = true;
        return this.optionsSelector(column);
      },

      /**
       * Sets a specific character set for the column.
       *
       * @param value - The charset to use (e.g., 'utf8mb4').
       */
      charset: (value: string) => {
        column.options.charset = value;
        return this.optionsSelector(column);
      },

      /**
       * Sets a specific collation for the column.
       *
       * @param value - The collation to use (e.g., 'utf8mb4_unicode_ci').
       */
      collation: (value: string) => {
        column.options.collation = value;
        return this.optionsSelector(column);
      },

      /**
       * Allows NULL values in the column.
       */
      nullable: () => {
        column.options.nullable = true;
        return this.optionsSelector(column);
      },

      /**
       * Sets a default value for the column.
       *
       * @param value - The default value (string, number, or boolean).
       */
      default: (value: string | number | boolean) => {
        column.options.default = value;
        return this.optionsSelector(column);
      },

      /**
       * Adds a unique constraint to the column.
       */
      unique: () => {
        column.options.unique = true;
        return this.optionsSelector(column);
      },

      /**
       * Marks the column as unsigned (positive integers only).
       */
      unsigned: () => {
        column.options.unsigned = true;
        return this.optionsSelector(column);
      },

      /**
       * Adds a comment to the column definition.
       *
       * @param text - The comment text.
       */
      comment: (text: string) => {
        column.options.comment = text;
        return this.optionsSelector(column);
      },

      /**
       * Marks the column for schema alteration (e.g., `ALTER COLUMN ... CHANGE`).
       */
      change: () => {
        column.options.change = true;
        return this.optionsSelector(column);
      },

      /**
       * Sets the foreign table for a foreign key constraint.
       *
       * @param table - The referenced table name.
       */
      foreign: (table: string) => {
        column.options.foreign = table;
        return this.optionsSelector(column);
      },

      /**
       * Sets the foreign column for a foreign key constraint.
       *
       * @param columnName - The referenced column name.
       */
      references: (columnName: string) => {
        column.options.references = columnName;
        return this.optionsSelector(column);
      },

      /**
       * Defines the ON DELETE action for a foreign key.
       *
       * @param action - The delete action (e.g., 'cascade', 'set null').
       */
      onDelete: (action: string) => {
        column.options.onDelete = action;
        return this.optionsSelector(column);
      },

      /**
       * Defines the ON UPDATE action for a foreign key.
       *
       * @param action - The update action (e.g., 'cascade', 'restrict').
       */
      onUpdate: (action: string) => {
        column.options.onUpdate = action;
        return this.optionsSelector(column);
      },
    };
  }


  /**
   * Adds an auto-incrementing UNSIGNED BIGINT 'id' primary key column.
   * Equivalent to Laravel's $table->id()
   */
  id(columnName: string = "id") {
    this.columns.push({
      type: "bigint",
      name: columnName,
      options: {
        primary: true,
        autoIncrement: true,
        unsigned: true,
      },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count])
      .primary()
      .autoIncrement()
      .unsigned();
  }
  /**
   * Adds a standard INTEGER column.
   * Equivalent to $table->integer('name')
   */
  integer(name: string) {
    this.columns.push({
      type: "integer",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }
  /**
   * Adds a BOOLEAN column.
   * Equivalent to $table->boolean('name')
   */
  boolean(name: string) {
    this.columns.push({
      type: "boolean",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }
  /**
   * Adds an UNSIGNED BIGINT column.
   * Equivalent to $table->bigInteger('name')->unsigned()
   */
  bigInteger(name: string) {
    this.columns.push({
      type: "bigint",
      name,
      options: { unsigned: true },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]).unsigned();
  }
  /**
   * Adds a foreign key column using BIGINT UNSIGNED.
   * Equivalent to $table->foreignId('user_id')
   */
  foreignId(name: string) {
    this.columns.push({
      type: "bigint",
      name,
      options: { unsigned: true },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]).unsigned();
  }
  /**
   * Adds a TINYINT column.
   * Equivalent to $table->tinyInteger('name')
   */
  tinyInteger(name: string) {
    this.columns.push({
      type: "tinyint",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }
  /**
   * Adds a SMALLINT column.
   * Equivalent to $table->smallInteger('name')
   */
  smallInteger(name: string) {
    this.columns.push({
      type: "smallint",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }
  /**
   * Adds a MEDIUMINT column.
   * Equivalent to $table->mediumInteger('name')
   */
  mediumInteger(name: string) {
    this.columns.push({
      type: "mediumint",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }
  /**
   * Adds a DECIMAL column with precision and scale.
   * Equivalent to $table->decimal('amount', 8, 2)
   */
  decimal(name: string, precision = 8, scale = 2) {
    this.columns.push({
      type: "decimal",
      name,
      options: { precision, scale },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }
  /**
   * Adds a FLOAT column (optional precision and scale).
   * Equivalent to $table->float('price', 8, 2)
   */
  float(name: string, precision?: number, scale?: number) {
    this.columns.push({
      type: "float",
      name,
      options: { precision, scale },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }
  /**
   * Adds a DOUBLE column (optional precision and scale).
   * Equivalent to $table->double('rate', 8, 2)
   */
  double(name: string, precision?: number, scale?: number) {
    this.columns.push({
      type: "double",
      name,
      options: { precision, scale },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }
  /**
   * Adds an UNSIGNED INTEGER column.
   * Equivalent to $table->unsignedInteger('name')
   */
  unsignedInteger(name: string) {
    this.columns.push({
      type: "integer",
      name,
      options: { unsigned: true },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]).unsigned();
  }

  // strings

  /**
 * Adds a VARCHAR column with a default length of 255.
 * Equivalent to $table->string('name', 255)
 */
  string(name: string, length: number = 255) {
    this.columns.push({
      type: "string",
      name,
      options: { length },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }
  /**
   * Adds a TEXT column.
   * Equivalent to $table->text('name')
   */
  text(name: string) {
    this.columns.push({
      type: "text",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Adds a CHAR column with a fixed length (default: 255).
   * Equivalent to $table->char('name', 255)
   */
  char(name: string, length = 255) {
    this.columns.push({
      type: "char",
      name,
      options: { length },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }


  /**
   * Adds a UUID column.
   * Equivalent to $table->uuid('name')
   */
  uuid(name: string) {
    this.columns.push({
      type: "uuid",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Adds a TINYTEXT column.
   * Equivalent to $table->tinyText('name')
   */
  tinyText(name: string) {
    this.columns.push({
      type: "tinyText",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Adds a MEDIUMTEXT column.
   * Equivalent to $table->mediumText('name')
   */
  mediumText(name: string) {
    this.columns.push({
      type: "mediumText",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Adds a LONGTEXT column.
   * Equivalent to $table->longText('name')
   */
  longText(name: string) {
    this.columns.push({
      type: "longText",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }


  // date and time

  /**
   * Add a DATE column (YYYY-MM-DD).
   * Equivalent to Laravel's `date()` column type.
   * 
   * @param name - The name of the column.
   */
  date(name: string) {
    this.columns.push({
      type: "date",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Add a DATETIME column (YYYY-MM-DD HH:MM:SS) with optional fractional seconds precision.
   * Equivalent to Laravel's `dateTime()` column type.
   * 
   * @param name - The name of the column.
   * @param precision - Optional fractional seconds precision (0-6).
   */
  dateTime(name: string, precision?: number) {
    this.columns.push({
      type: "datetime",
      name,
      options: { precision },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Add a TIME column (HH:MM:SS) with optional fractional seconds precision.
   * Equivalent to Laravel's `time()` column type.
   * 
   * @param name - The name of the column.
   * @param precision - Optional fractional seconds precision (0-6).
   */
  time(name: string, precision?: number) {
    this.columns.push({
      type: "time",
      name,
      options: { precision },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Add a TIMESTAMP column (used for created_at, updated_at, etc.) with optional precision.
   * Equivalent to Laravel's `timestamp()` column type.
   * 
   * @param name - The name of the column.
   * @param precision - Optional fractional seconds precision (0-6).
   */
  timestamp(name: string, precision?: number) {
    this.columns.push({
      type: "timestamp",
      name,
      options: { precision },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }


  /**
   * Add a YEAR column (typically stores a 4-digit year).
   * Equivalent to Laravel's `year()` column type.
   * 
   * @param name - The name of the column.
   */
  year(name: string) {
    this.columns.push({
      type: "year",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Add `created_at` and `updated_at` TIMESTAMP columns.
   * Typically used for automatic timestamping of model creation and updates.
   * Equivalent to Laravel's `timestamps()` helper.
   */
  timestamps() {
    this.columns.push({
      type: "timestamp",
      name: "created_at",
      options: { length: 0 },
    });
    this.columns.push({
      type: "timestamp",
      name: "updated_at",
      options: { length: 0 },
    });
    this.columnCount += 2;
  }

  /**
   * Add a nullable `deleted_at` TIMESTAMP column to support soft deletes.
   * Equivalent to Laravel's `softDeletes()` method.
   * 
   * @param precision - Optional fractional seconds precision (0-6), default is 0.
   */
  softDeletes(precision: number = 0) {
    this.columns.push({
      type: "timestamp",
      name: "deleted_at",
      options: {
        nullable: true,
        default: null,
        precision,
      },
    });
    this.columnCount++;
  }

  /**
   * Add a JSON column for storing structured data (like objects or arrays).
   * Equivalent to Laravel's `json()` column type.
   * 
   * @param name - The name of the column.
   */
  json(name: string) {
    this.columns.push({
      type: "json",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }


  /**
   * Add an ENUM column with a fixed set of allowed string values.
   * Equivalent to Laravel's `enum()` column type.
   *
   * @param name - The name of the column.
   * @param allowed - An array of allowed string values.
   */
  enum(name: string, allowed: string[]) {
    this.columns.push({
      type: "enum",
      name,
      options: { allowed },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Add a SET column which can store one or more values from a predefined list.
   * Only supported in MySQL.
   *
   * @param name - The name of the column.
   * @param allowed - An array of allowed string values.
   */
  set(name: string, allowed: string[]) {
    this.columns.push({
      type: "set",
      name,
      options: { allowed },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Add a BINARY column (fixed-length binary data).
   * Useful for storing hashes, tokens, or binary identifiers.
   *
   * @param name - The name of the column.
   */
  binary(name: string) {
    this.columns.push({
      type: "binary",
      name,
      options: {},
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Add a column for storing IP addresses.
   * Uses VARCHAR(45) to support both IPv4 and IPv6.
   *
   * @param name - The name of the column.
   */
  ipAddress(name: string) {
    this.columns.push({
      type: "string",
      name,
      options: { length: 45 },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Add a column for storing MAC addresses.
   * Uses VARCHAR(17), which is the standard length for MACs.
   *
   * @param name - The name of the column.
   */
  macAddress(name: string) {
    this.columns.push({
      type: "string",
      name,
      options: { length: 17 },
    });
    const count = this.columnCount;
    this.columnCount++;
    return this.optionsSelector(this.columns[count]);
  }

  /**
   * Mark a column to be dropped from the table.
   * Used during schema alteration (e.g., in `table.dropColumn()`).
   *
   * @param name - The name of the column to drop.
   */
  dropColumn(name: string) {
    this.drops.push(name);
  }


}
