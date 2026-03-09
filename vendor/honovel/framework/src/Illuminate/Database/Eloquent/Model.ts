import {
  AccessorMap,
  ModelAttributes,
  PHPTimestampFormat,
} from "../../../../../@types/declaration/Base/IBaseModel.d.ts";
import { DB } from "../../Support/Facades/index.ts";
import pluralize from "pluralize";
import { generateTableName } from "./helpers.ts";
import Builder from "./Builder.ts";
import { Factory, HasFactory } from "./Factories/index.ts";
import Collection from "./Collection.ts";
import {
  WhereInterpolator,
  WhereOperator,
  WherePrimitive,
} from "../Query/index.ts";

export default abstract class Model<
  T extends ModelAttributes = ModelAttributes,
> {
  constructor(attributes: Partial<T> = {}) {
    this.fill(attributes as T);
  }
  protected static createdAtColumn: string = "created_at";
  protected static updatedAtColumn: string = "updated_at";

  protected static use?: Record<string, unknown>;

  protected static _timeStamps: boolean = true;

  protected static _table?: string;

  protected static _primaryKey: string = "id";

  protected static _incrementing: boolean = true;

  protected static _keyType: "int" | "string" | "uuid" = "int";

  protected static _fillable: Array<string> = [];
  protected static _guarded: Array<string> = [];

  protected static _hidden: Array<string> = [];

  protected static _visible: Array<string> = [];

  protected static _dateFormat: PHPTimestampFormat = "Y-m-d H:i:s";

  private _attributes: T = {} as T;

  private _defaultConnection: string = DB.getDefaultConnection();

  protected static _casts: Record<
    string,
    "string" | "boolean" | "object" | "int" | "array"
  > = {};

  protected static _softDelete: boolean = false;

  protected static _deletedAtColumn: string = "deleted_at";

  protected static _accessors: AccessorMap<Record<string, unknown>> = {};

  protected static _mutators: AccessorMap<Record<string, unknown>> = {};

  public getTableName(): string {
    const ctor = this.constructor as typeof Model;
    if (ctor._table) {
      return ctor._table;
    }
    return generateTableName(ctor.name);
  }

  private singularizeLastWord(name: string, separator: string = "_"): string {
    const parts = name.split(separator);
    if (parts.length === 0) {
      return name;
    }
    const lastWord = parts.pop()!;
    const singularLastWord = pluralize.singular(lastWord);
    parts.push(singularLastWord);
    return parts.join(separator);
  }

  public getSingularTableName(): string {
    const tableName = this.getTableName();
    return this.singularizeLastWord(tableName);
  }

  private _connection?: string;

  /**
   * Get the database connection for the model.
   * @returns The name of the database connection.
   */
  public getConnection(): string {
    const connection = this._connection || this._defaultConnection;
    return connection;
  }

  /**
   * Set the database connection for the model.
   * @param connection The name of the database connection.
   * @returns The model instance.
   */
  public setConnection(connection: string): this {
    if (!DB.hasConnection(connection)) {
      throw new Error(`Database connection "${connection}" does not exist.`);
    }
    this._connection = connection;
    return this;
  }

  /**
   * Get the primary key name for the model.
   * @returns The primary key name.
   */
  public getKeyName(): string {
    return (this.constructor as typeof Model)._primaryKey;
  }

  /**
   * Get the primary key value for the model.
   * @returns The primary key value.
   */
  public getKey(): string | number {
    return this._attributes[(this.constructor as typeof Model)._primaryKey] as
      | string
      | number;
  }

  /**
   * Check if the model uses timestamps.
   * @returns True if the model uses timestamps, false otherwise.
   */
  public usesTimestamps(): boolean {
    return (this.constructor as typeof Model)._timeStamps;
  }

  /**
   * Get an attribute value by key.
   * @param key The attribute key.
   * @returns The attribute value or null if not found.
   */
  public getAttribute<K extends keyof T>(key: K): T[K] | null {
    let value: unknown = this._attributes[key] ?? null;

    const cast = (this.constructor as typeof Model)._casts?.[String(key)];
    if (isset(cast)) {
      switch (cast) {
        case "string": {
          value = isset(value) ? String(value) : null;
          break;
        }
        case "boolean": {
          value = Boolean(value);
          break;
        }
        case "int": {
          if (!isset(value) || empty(value)) {
            value = null;
            break;
          }

          if (isString(value) || isNumeric(value)) {
            const parsed = parseInt(value as string, 10);
            value = isNaN(parsed) ? null : parsed;
          } else if (isArray(value)) {
            const parsed = parseInt(value[0] as string, 10);
            value = isNaN(parsed) ? null : parsed;
          } else {
            value = null;
          }
          break;
        }
        case "array":
        case "object": {
          if (!isset(value)) {
            value = cast === "array" ? [] : {};
            break;
          }

          if (isString(value)) {
            try {
              value = JSON.parse(value);
            } catch {
              value = cast === "array" ? [] : {};
            }
          }
          break;
        }
        default:
          break;
      }
    }

    const accessor = (this.constructor as typeof Model)._accessors?.[
      String(key)
    ];
    if (isset(accessor) && isFunction(accessor)) {
      value = accessor(value);
    }
    return value as T[K] | null;
  }

  /**
   * Get all attribute values.
   * @returns An object containing all attribute values.
   */
  public getAttributes(): Record<string, unknown> {
    const keys = Object.keys(this._attributes);
    const data: Record<string, unknown> = {};
    for (const key of keys) {
      data[key] = this.getAttribute(key);
    }
    return data;
  }

  /**
   * Set an attribute value by key.
   * @param key The attribute key.
   * @param value The attribute value.
   */
  public setAttribute<K extends keyof T>(key: K, value: T[K]): void {
    if (
      isset((this.constructor as typeof Model)._guarded) &&
      keyExist((this.constructor as typeof Model)._guarded, key)
    ) {
      throw new Error(
        `Attribute "${String(key)}" is guarded and cannot be set.`,
      );
    }
    if (
      keyExist((this.constructor as typeof Model)._mutators, key) &&
      isFunction((this.constructor as typeof Model)._mutators[key])
    ) {
      const mutator = (this.constructor as typeof Model)._mutators[key];
      if (mutator) {
        value = mutator(value) as T[K];
      }
    }
    if (!Object.prototype.hasOwnProperty.call(this, key)) {
      Object.defineProperty(this, key, {
        get: () => this.getAttribute(key as string),
        configurable: true,
        enumerable: true,
      });
    }
    this._attributes[key] = value;
  }

  /**
   * Fill the model with attributes.
   * @param attributes The attributes to fill.
   * @returns The model instance.
   */
  public fill(attributes: Partial<T>): this {
    const fillable = [...(this.constructor as typeof Model)._fillable];
    const guarded = [...(this.constructor as typeof Model)._guarded];
    fillable.push((this.constructor as typeof Model)._primaryKey);
    if (this.usesTimestamps()) {
      fillable.push(
        (this.constructor as typeof Model).createdAtColumn,
        (this.constructor as typeof Model).updatedAtColumn,
      );
    }
    if (isset(fillable) && fillable.length > 0) {
      for (const [key, value] of Object.entries(attributes)) {
        if (fillable.includes(String(key))) {
          this.setAttribute(key as keyof T, value as T[keyof T]);
        } else {
          // ignore the attribute if not fillable
          throw new Error(
            `Attribute '${key}' is not fillable on model ${this.constructor.name}.`,
          );
        }
      }
    } else {
      if (!isset(guarded) || !guarded.length) {
        throw new Error(
          `No fillable attributes defined for model ${this.constructor.name}.`,
        );
      }
      for (const [key, value] of Object.entries(attributes)) {
        if (isset(guarded) && !guarded.includes(key as string)) {
          this.setAttribute(key as keyof T, value as T[keyof T]);
        } else {
          throw new Error(`Attribute "${key}" is guarded and cannot be set.`);
        }
      }
    }
    return this;
  }

  /**
   * Force fill the model with attributes.
   * @param attributes The attributes to fill.
   * @returns The model instance.
   */
  public forceFill(attributes: T): this {
    for (const [key, value] of Object.entries(attributes)) {
      // @ts-ignore //
      this.setAttribute(key, value);
    }
    return this; // 🔁 Return the same instance to allow chaining
  }

  /**
   * Convert the model instance to a plain object.
   * @returns A plain object representation of the model.
   */
  public toObject(): Record<string, unknown> {
    const data: Record<string, unknown> = { ...this._attributes };

    // Handle hidden & visible
    if ((this.constructor as typeof Model)._visible.length > 0) {
      // Only include visible keys
      for (const key of Object.keys(data)) {
        if (!(this.constructor as typeof Model)._visible.includes(key)) {
          delete data[key];
        }
      }
    }
    if ((this.constructor as typeof Model)._hidden.length > 0) {
      // Remove hidden keys
      for (const key of (this.constructor as typeof Model)._hidden) {
        delete data[key];
      }
    }

    // Recursively convert related models (if any)
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Model) {
        data[key] = value.toObject(); // single related model
      } else if (value instanceof Collection) {
        data[key] = value.toArray(); // collection of related models
      } else if (value instanceof Date) {
        data[key] = value.toISOString(); // convert Date to ISO string
      }
    }

    return data;
  }

  /**
   * Convert the model instance to a JSON string.
   * @returns A JSON string representation of the model.
   */
  public toJSON(): string {
    return jsonEncode(this.toObject());
  }

  /**
   * Check if the model has a cast for the given attribute.
   * @param attribute The attribute name.
   * @returns True if the model has a cast for the attribute, false otherwise.
   */
  public hasCast(attribute: string): boolean {
    return keyExist((this.constructor as typeof Model)._casts, attribute);
  }

  /**
   * Get all raw attribute values.
   * @returns An object containing all raw attribute values.
   */
  public getRawAttributes(): Record<string, unknown> {
    return { ...this._attributes };
  }

  /**
   * Get a raw attribute value by key.
   * @param key The attribute key.
   * @returns The raw attribute value or null if not found.
   */
  public getRawAttribute<K extends keyof T>(key: K): T[K] | null {
    return this._attributes[key] ?? null;
  }

  /**
   * Soft delete the model instance.
   * @returns The model instance.
   */
  public softDelete(): this {
    if (!(this.constructor as typeof Model)._softDelete) {
      throw new Error("Soft delete is not enabled for this model.");
    }
    // @ts-ignore //
    this.setAttribute("_deletedAtColumn", date("Y-m-d H:i:s"));
    return this;
  }

  /**
   * Restore the soft-deleted model instance.
   * @returns The model instance.
   */
  public restore(): this {
    if (!(this.constructor as typeof Model)._softDelete) {
      throw new Error("Soft delete is not enabled for this model.");
    }
    // @ts-ignore //
    this.setAttribute(this.getDeletedAtColumn(), null);
    return this;
  }

  /**
   * Check if the model is soft-deleted.
   * @returns True if the model is soft-deleted, false otherwise.
   */
  public isTrashed(): boolean {
    if (!(this.constructor as typeof Model)._softDelete) {
      throw new Error("Soft delete is not enabled for this model.");
    }
    return (
      this.getAttribute((this.constructor as typeof Model)._deletedAtColumn) !==
      null
    );
  }

  /**
   * Get the deleted at column name.
   * @returns The deleted at column name.
   */
  public getDeletedAtColumn(): string {
    return (this.constructor as typeof Model)._deletedAtColumn;
  }

  /**
   * Serialize the model's date attributes.
   * @param format The date format.
   * @returns The serialized date string.
   */
  public serializeDate(format: PHPTimestampFormat = "Y-m-d H:i:s"): string {
    return date(format);
  }

  /**
   * Add an accessor to the model.
   * @param attribute The attribute name.
   * @param fn The accessor function.
   */
  public addAccessor(
    attribute: keyof T,
    fn: (value: T[keyof T]) => unknown,
  ): void {
    if (!isFunction(fn)) {
      throw new Error("Accessor must be a function.");
    }
    (this.constructor as typeof Model)._accessors[String(attribute)] = fn;
    if (!Object.prototype.hasOwnProperty.call(this, attribute)) {
      Object.defineProperty(this, attribute, {
        get: () => {
          const raw = this._attributes[attribute] ?? null;
          if (
            keyExist(
              (this.constructor as typeof Model)._accessors,
              attribute,
            ) &&
            isFunction((this.constructor as typeof Model)._accessors[attribute])
          ) {
            const accessorFn = (this.constructor as typeof Model)._accessors[
              attribute
            ];
            return accessorFn ? accessorFn(raw) : raw;
          } else {
            return raw;
          }
        },
        configurable: true,
        enumerable: true,
      });
    }
  }

  /**
   * Add a mutator to the model.
   * @param attribute The attribute name.
   * @param fn The mutator function.
   */
  public addMutator<K extends keyof T>(
    attribute: K,
    fn: (value: T[K]) => unknown,
  ): void {
    if (typeof fn !== "function") {
      throw new Error("Mutator must be a function.");
    }
    (this.constructor as typeof Model)._mutators[String(attribute)] = fn as (
      value: unknown,
    ) => unknown;
  }

  /**
   * Set the database connection for the model.
   * @param db The database connection name.
   */
  public static on(db?: string) {
    if (!isset(db)) {
      // @ts-ignore //
      const instanceModel = new this() as Model<ModelAttributes>;
      db = instanceModel.getConnection();
    }

    return new AfterOn(this, db);
  }

  /**
   * Create a new model instance.
   * @param attributes The attributes to set on the model.
   * @returns The created model instance.
   */
  public static async create<Attr extends Record<string, unknown>>(
    attributes?: Attr,
  ) {
    // @ts-ignore //
    const instance = new this(attributes) as Model<ModelAttributes>;
    await instance.save();
    return instance;
  }

  /**
   * Create a new model instance.
   * @param connection The database connection name.
   * @returns The created model instance.
   */
  // Never use this in production code, it's for development CLI only.
  public static async factory(connection?: string): Promise<Factory> {
    if (!isset(this.use)) {
      throw new Error("This model does not support factories.");
    }
    if (!isset(this.use["HasFactory"])) {
      throw new Error("This model does not support factories.");
    }
    if (!isset(connection)) {
      connection = DB.getDefaultConnection();
    }
    if (!DB.hasConnection(connection)) {
      throw new Error(`Database connection "${connection}" does not exist.`);
    }
    const factoryClass = this.use["HasFactory"] as typeof HasFactory;

    if (!isset(factoryClass)) {
      throw new Error("Factory class not found for this model.");
    }
    if (!methodExist(factoryClass, "getFactoryByModel")) {
      throw new Error(`${this.name} does not have a factory method.`);
    }
    const factory = await factoryClass.getFactoryByModel(this);
    // @ts-ignore //
    factory.setConnection(connection);
    return factory as Factory;
  }

  /**
   * Get a new query builder instance for the model.
   * @returns The query builder instance.
   */
  public static query(): Builder {
    return new Builder({
      model: this,
      fields: ["*"],
    });
  }

  /**
   * Eager load relationships for the model.
   * @param modelActions The model actions to eager load.
   * @returns The query builder instance.
   */
  public static with(...modelActions: string[]) {
    const arrActionsAndFields: Array<{
      actions: string[];
      fields: string[][];
    }> = [];
    modelActions.forEach((modelAction) => {
      const separateActions = modelAction.split("."); // ["posts", "comments"]
      const actionFields = separateActions.map((action) => {
        const [a, fields = "*"] = action.split(":");
        return { action: a, fields };
      });
      const actions = actionFields.map((item) => item.action);
      const fields = actionFields.map((item) => item.fields.split(","));
      arrActionsAndFields.push({ actions, fields });
    });

    return new WithBuilder(
      {
        model: this,
      },
      arrActionsAndFields,
    );
  }

  public static where(
    column: string,
    operator: WhereOperator,
    value: WherePrimitive,
  ): Builder;
  public static where(column: string, value: WherePrimitive): Builder;
  public static where(callback: (qb: WhereInterpolator) => void): Builder;
  /**
   * Add a where clause to the query.
   * @param args The where clause arguments.
   * @returns The query builder instance.
   */
  public static where(
    ...args: [
      string | ((qb: WhereInterpolator) => void),
      (WhereOperator | WherePrimitive)?,
      WherePrimitive?,
    ]
  ): Builder {
    return new Builder({
      model: this,
      fields: ["*"],
      // @ts-ignore //
    }).where(...args);
  }

  /**
   * Add a whereIn clause to the query.
   * @param column The column name.
   * @param values The values to check for.
   * @returns The query builder instance.
   */
  public static whereIn(
    column: string,
    values: unknown[],
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereIn(column, values);
  }

  /**
   * Add a whereNotIn clause to the query.
   * @param column The column name.
   * @param values The values to check for.
   * @returns The query builder instance.
   */
  public static whereNotIn(
    column: string,
    values: unknown[],
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNotIn(column, values);
  }

  /**
   * Add a whereNull clause to the query.
   * @param column The column name.
   * @returns The query builder instance.
   */
  public static whereNull(
    column: string,
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNull(column);
  }

  /**
   * Add a whereNotNull clause to the query.
   * @param column The column name.
   * @returns The query builder instance.
   */
  public static whereNotNull(
    column: string,
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNotNull(column);
  }

  /**
   * Add a whereBetween clause to the query.
   * @param column The column name.
   * @param values The values to check between.
   * @returns The query builder instance.
   */
  public static whereBetween(
    column: string,
    values: [unknown, unknown],
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereBetween(column, values);
  }

  /**
   * Add a whereNotBetween clause to the query.
   * @param column The column name.
   * @param values The values to check between.
   * @returns The query builder instance.
   */
  public static whereNotBetween(
    column: string,
    values: [unknown, unknown],
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNotBetween(column, values);
  }

  /**
   * Add a join clause to the query.
   * @param table The table name to join.
   * @param column1 The column name on the main table.
   * @param column2 The column name on the joined table.
   * @returns The query builder instance.
   */
  public static join(table: string, column1: string, column2: string): Builder {
    return new Builder({
      model: this,
      fields: ["*"],
    }).join(table, column1, column2);
  }

  /**
   * Add a leftJoin clause to the query.
   * @param table The table name to join.
   * @param column1 The column name on the main table.
   * @param column2 The column name on the joined table.
   * @returns The query builder instance.
   */
  public static leftJoin(
    table: string,
    column1: string,
    column2: string,
  ): Builder {
    return new Builder({
      model: this,
      fields: ["*"],
    }).leftJoin(table, column1, column2);
  }

  /**
   * Add a rightJoin clause to the query.
   * @param table The table name to join.
   * @param column1 The column name on the main table.
   * @param column2 The column name on the joined table.
   * @returns The query builder instance.
   */
  public static rightJoin(
    table: string,
    column1: string,
    column2: string,
  ): Builder {
    return new Builder({
      model: this,
      fields: ["*"],
    }).rightJoin(table, column1, column2);
  }

  /**
   * Add a crossJoin clause to the query.
   * @param table The table name to join.
   * @returns The query builder instance.
   */
  public static crossJoin(table: string): Builder {
    return new Builder({
      model: this,
      fields: ["*"],
    }).crossJoin(table);
  }

  /**
   * Add a fullJoin clause to the query.
   * @param table The table name to join.
   * @param column1 The column name on the main table.
   * @param column2 The column name on the joined table.
   * @returns The query builder instance.
   */
  public static fullJoin(
    table: string,
    column1: string,
    column2: string,
  ): Builder {
    return new Builder({
      model: this,
      fields: ["*"],
    }).fullJoin(table, column1, column2);
  }

  /**
   * Add a groupBy clause to the query.
   * @param columns The column names to group by.
   * @returns The query builder instance.
   */
  public static groupBy(...columns: string[]): Builder {
    return new Builder({
      model: this,
      fields: ["*"],
    }).groupBy(...columns);
  }

  /**
   * Add an orderBy clause to the query.
   * @param column The column name to order by.
   * @param direction The direction to order (asc or desc).
   * @returns The query builder instance.
   */
  public static orderBy(
    column: string,
    direction: "asc" | "desc" = "asc",
  ): Builder {
    return new Builder({
      model: this,
      fields: ["*"],
    }).orderBy(column, direction);
  }

  /**
   * Get all records from the database.
   * @returns An array of model instances.
   */
  public static async all<T extends typeof Model = typeof Model>(): Promise<
    InstanceType<T>[]
  > {
    return await new Builder({
      model: this,
      fields: ["*"],
    }).get<T>();
  }

  /**
   * Get the first record from the database.
   * @returns The first model instance or null.
   */
  public static async first(): Promise<InstanceType<
    typeof Model<ModelAttributes>
  > | null> {
    return await new Builder({
      model: this,
      fields: ["*"],
    }).first();
  }

  /**
   * Find a record by its primary key.
   * @param id The primary key value.
   * @returns The model instance or null.
   */
  public static async find<
    M extends Model<ModelAttributes> = Model<ModelAttributes>,
  >(id: string | number): Promise<M | null> {
    // @ts-ignore //
    const instanceModel = new this() as M;
    const primaryKey = instanceModel.getKeyName();
    return (await new Builder({
      model: this,
      fields: ["*"],
    })
      .where(primaryKey, id)
      .first()) as unknown as M;
  }

  /**
   * Find a record by its primary key or fail.
   * @param id The primary key value.
   * @returns The model instance.
   */
  public static async findOrFail<
    M extends Model<ModelAttributes> = Model<ModelAttributes>,
  >(id: string | number): Promise<M> {
    try {
      const record = await this.find<M>(id);
      if (!record) {
        throw new Error(
          `${this.name} where ${this._primaryKey}='${id}' not found.`,
        );
      }
      return record;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save the model instance to the database.
   * Create or update the record.
   * @returns A promise that resolves when the save operation is complete.
   */
  async save() {
    const data = this.getRawAttributes();
    const tableName = this.getTableName();
    const primaryKey = this.getKeyName();
    const isUsingTimestamps = this.usesTimestamps();
    const now = this.serializeDate();
    if (isUsingTimestamps) {
      data[(this.constructor as typeof Model).createdAtColumn] = now;
      data[(this.constructor as typeof Model).updatedAtColumn] = now;
    }

    // @ts-ignore //
    if (this[primaryKey]) {
      // Update existing record
      if (isUsingTimestamps) {
        // delete the created_at field if it exists
        delete data[(this.constructor as typeof Model).createdAtColumn];
      }
      // @ts-ignore //
      await DB.connection(this.getConnection()).update(tableName, data, {
        // @ts-ignore //
        [primaryKey]: this[primaryKey],
      });
    } else {
      // Create new record
      const newRecord = await DB.connection(this.getConnection()).insert(
        tableName,
        data,
      );
      // get the inserted id
      this.setAttribute(
        primaryKey,
        newRecord.lastInsertRowId as T[typeof primaryKey],
      );
    }
  }

  /**
   * Define a one-to-many relationship.
   * @param relationModel The related model class.
   * @param foreignKey The foreign key column name.
   * @returns The relationship query builder.
   */
  public hasMany(
    relationModel: typeof Model<ModelAttributes>,
    foreignKey?: string,
  ) {
    if (!foreignKey) {
      const primaryKey = this.getKeyName();
      foreignKey = `${this.getSingularTableName()}_${primaryKey}`;
    }
    const primaryValue = this.getKey();
    if (!isset(primaryValue)) {
      throw new Error(
        `Model ${this.constructor.name} does not have a primary key set.`,
      );
    }
    const has = "hasMany";
    return new Builder({
      model: relationModel,
      fields: ["*"],
      has,
    }).where(foreignKey, this.getKey());
  }

  /**
   * Define a one-to-one relationship.
   * @param relationModel The related model class.
   * @param foreignKey The foreign key column name.
   * @returns The relationship query builder.
   */

  public hasOne(
    relationModel: typeof Model<ModelAttributes>,
    foreignKey?: string,
  ) {
    if (!foreignKey) {
      const primaryKey = this.getKeyName();
      foreignKey = `${this.getSingularTableName()}_${primaryKey}`;
    }
    const primaryValue = this.getKey();
    if (!isset(primaryValue)) {
      throw new Error(
        `Model ${this.constructor.name} does not have a primary key set.`,
      );
    }
    const has = "hasOne";
    return new Builder({
      model: relationModel,
      fields: ["*"],
      has,
    })
      .where(foreignKey, this.getKey())
      .limit(1);
  }

  /**
   * Check if the user has verified their email address.
   * @returns True if the email is verified, false otherwise.
   */
  public hasVerifiedEmail(): boolean {
    const emailVerifiedAt = this.getRawAttribute("email_verified_at");
    return emailVerifiedAt !== null;
  }
}

// Import AfterOn and WithBuilder to avoid circular dependency issues
import AfterOn from "./AfterOn.ts";
import WithBuilder from "./WithBuilder.ts";
