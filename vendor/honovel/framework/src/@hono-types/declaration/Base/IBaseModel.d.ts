export type PHPTimestampFormat =
  | "Y-m-d H:i:s"
  | "Y-m-d\\TH:i:sP"
  | "Y-m-d\\TH:i:sO";

export type AccessorMap<T extends Record<string, unknown>> = {
  [K in keyof T]?: (value: T[K]) => unknown;
};

export type FieldsPopulate<T extends Record<string, any>> = Array<keyof T>;

type Attr = Record<string, unknown>;

export interface IBaseModelProperties {
  _attributes: Attr;
}

export type ModelWithAttributes<
  T extends Record<string, unknown>,
  C extends new (attr: T) => unknown
> = (new (...args: ConstructorParameters<C>) => InstanceType<C> & T) & C;

export type CastType = "string" | "int" | "boolean" | "array" | "object";
/**
 * Interface/Base class emulating Laravel's Eloquent Model behavior.
 */

/**
 * Static methods for model operations
 */
export declare class IStaticBaseModel {
  /**
   * @param attributes Attributes to create a new model instance
   */
  public static create(attributes: Record<string, unknown>): Promise<boolean>;
}



/**
 * BaseModel class provides structure and behavior for working with data models
 * similar to Laravel's Eloquent, including fillable, guarded, casting,
 * timestamps, soft deletes, accessors, mutators, and JSON serialization.
 */
declare class IBaseModel<T extends IBaseModelProperties> {
  constructor(attributes?: T["_attributes"]);

  /** Whether timestamps are automatically managed */
  protected _timeStamps: boolean;

  /** Custom table name override */
  protected _table?: string;

  /** The name of the primary key column */
  protected _primaryKey: string;

  /** Whether the primary key is auto-incrementing */
  protected _incrementing: boolean;

  /** Type of the primary key */
  protected _keyType: "int" | "string" | "uuid";

  /** List of attributes that are mass assignable */
  protected _fillable: string[];

  /** List of attributes that are protected from mass assignment */
  protected _guarded: string[];

  /** List of attributes hidden when serializing to objects or JSON */
  protected _hidden: string[];

  /** List of attributes visible when serializing */
  protected _visible: string[];

  /** The date format used when serializing dates */
  protected _dateFormat: PHPTimestampFormat;

  /** Model's attribute storage */
  protected _attributes: T["_attributes"];

  /** Attribute cast map (string, int, boolean, array, object) */
  protected _casts: Record<keyof T["_attributes"], "string" | "boolean" | "object" | "int" | "array">;

  /** Tuple of fields used for created_at and updated_at */
  protected _timestampsFields: [string, string];

  /** Whether soft delete behavior is enabled */
  protected _softDelete: boolean;

  /** The column name for soft deletes */
  protected _deletedAtColumn: string;

  /** Accessor map for transforming values on retrieval */
  protected _accessors: AccessorMap<T["_attributes"]>;

  /** Mutator map for transforming values on assignment */
  protected _mutators: AccessorMap<T["_attributes"]>;

  /** Get the final table name */
  public getTableName(): string;

  /** Get the primary key column name */
  public getKeyName(): string;

  /** Get the primary key value of the model */
  public getKey(): string | number;

  /** Check if timestamps are enabled */
  public usesTimestamps(): boolean;

  /** Retrieve a specific attribute, with casting and accessor applied */
  public getAttribute<K extends keyof T["_attributes"]>(key: K): T["_attributes"][K] | null;

  /** Retrieve all attributes, passed through accessors and casts */
  public getAttributes(): Record<string, unknown>;

  /** Set a specific attribute value with mutator applied */
  public setAttribute<K extends keyof T["_attributes"]>(key: K, value: T["_attributes"][K]): void;

  /** Fill the model with attributes (only fillable ones or unguarded) */
  public fill(attributes: T["_attributes"]): this;

  /** Fill the model with attributes, bypassing fillable/guarded rules */
  public forceFill(attributes: T["_attributes"]): this;

  /** Convert the model to a plain object, respecting visibility settings */
  public toObject(): Record<string, unknown>;

  /** Convert the model to a JSON string */
  public toJSON(): string;

  /** Check if a specific attribute has a cast rule */
  public hasCast(attribute: string): boolean;

  /** Return raw attributes without casting or accessors */
  public getRawAttributes(): Record<string, unknown>;

  /** Soft delete the model by setting the deleted_at column */
  public softDelete(): this;

  /** Restore a soft deleted model */
  public restore(): this;

  /** Check if the model has been soft deleted */
  public isTrashed(): boolean;

  /** Get the column name used for soft deletes */
  public getDeletedAtColumn(): string;

  /** Format current timestamp using the configured format */
  public serializeDate(format?: PHPTimestampFormat): string;

  /** Add a runtime accessor for a specific attribute */
  public addAccessor(
    attribute: keyof T["_attributes"],
    fn: (value: T["_attributes"][keyof T["_attributes"]]) => unknown
  ): void;

  /** Add a runtime mutator for a specific attribute */
  public addMutator<K extends keyof T["_attributes"]>(
    attribute: K,
    fn: (value: T["_attributes"][K]) => unknown
  ): void;

  /** Static factory method for model creation (not implemented) */
  public static create<Attr extends Record<string, unknown>>(attributes?: Attr): boolean;
}

export default IBaseModel;
