export type PHPTimestampFormat =
  | "Y-m-d H:i:s"
  | "Y-m-d\\TH:i:sP"
  | "Y-m-d\\TH:i:sO";

export interface AccessorMap {
  [key: string]: (value: unknown) => unknown;
}

export interface IBaseModelProperties {
  // deno-lint-ignore no-explicit-any
  _attributes: Record<string, Exclude<any, undefined>>;
}

export type ModelWithAttributes<
  T extends Record<string, any>,
  C extends new (...args: any[]) => any = any
> = (new (...args: ConstructorParameters<C>) => InstanceType<C> & T) & C;

/**
 * Interface/Base class emulating Laravel's Eloquent Model behavior.
 */
export declare class IBaseModel<
  T extends IBaseModelProperties = {
    _attributes: {};
  }
> extends IStaticBaseModel {
  constructor(attributes?: T["_attributes"]);
  /**
   * You can use this after you do this
   * const model = new Model();
   * model.setAttribute('name', 'value');
   * model.name; // 'value'
   */
  // [key: string]: unknown;

  /** Automatically maintain timestamps (created_at, updated_at) */
  protected _timeStamps: boolean;

  /** Table name associated with the model */
  protected _table?: string;

  /** Primary key column name (default: 'id') */
  protected _primaryKey: string;

  /** Whether the primary key auto-increments */
  protected _incrementing: boolean;

  /** Primary key type: int, string, or uuid */
  protected _keyType: "int" | "string" | "uuid";

  /** Attributes that are NOT mass assignable (equivalent to $guarded) */
  protected _guarded: keyof T["_attributes"][];

  /** Attributes that ARE mass assignable (equivalent to $fillable) */
  protected _fillable: keyof T["_attributes"][]; // Allow both string and keyof T

  /** Attributes hidden from arrays/JSON (equivalent to $hidden) */
  protected _hidden: keyof T["_attributes"][];

  /** Attributes visible in arrays/JSON (equivalent to $visible) */
  protected _visible: keyof T["_attributes"][];

  /** Date format for timestamps */
  protected _dateFormat: string;

  /** Default attributes or values (similar to $attributes or $casts) */
  protected _attributes: Record<string, unknown>;

  /** Attribute casting map (e.g., { active: 'boolean' }) */
  protected _casts: Record<string, "string" | "int" | "boolean" | "array" | "object">;

  /** Names of timestamp fields (default: ['created_at', 'updated_at']) */
  protected _timestampsFields: [string, string];

  /** Soft delete flag (enables deleted_at column) */
  protected _softDelete: boolean;

  /** Column used for soft deletes */
  protected _deletedAtColumn: string;

  /** Attribute accessors */
  protected _accessors: AccessorMap;

  /** Attribute mutators */
  protected _mutators: Record<string, (value: unknown) => unknown>;

  // ----------- Methods -----------

  /** Get the associated table name */
  public getTableName(): string;

  /** Get the primary key name */
  public getKeyName(): string;

  /** Get the value of the primary key */
  public getKey(): string | number;

  /** Whether the model uses timestamps */
  public usesTimestamps(): boolean;

  /** Get attribute value */
  public getAttribute(key: keyof T["_attributes"]): T["_attributes"][keyof T["_attributes"]];

  /** Set attribute value */
  public setAttribute<K extends keyof T>(key: K, value: T[K]): void;

  /** Fill the model with an object (mass assignment) */
  public fill(attributes: Record<keyof T["_attributes"], unknown>): this;

  /** Force fill, ignoring fillable/guarded */
  public forceFill(attributes: Record<string, unknown>): this;

  /** Convert model instance to JSON */
  public toJSON(): Record<string, unknown>;

  /** Convert model instance to a plain object */
  public toObject(): Record<string, unknown>;

  /** Check if attribute is casted */
  public hasCast(attribute: string): boolean;

  /** Get original raw attributes */
  public getRawAttributes(): Record<string, unknown>;

  /** Get all attributes, including hidden and visible */
  public getAttributes(): Record<string, unknown>;

  /** Mark model as deleted (soft delete) */
  public softDelete(): this;

  /** Restore a soft deleted model */
  public restore(): this;

  /** Check if model is soft deleted */
  public isTrashed(): boolean;

  /** Get the name of the deleted_at column */
  public getDeletedAtColumn(): string;

  /** Serialize date to string using format */
  public serializeDate(format: PHPTimestampFormat): string;

  /** Register an accessor */
  public addAccessor(attribute: string, fn: (value: unknown) => unknown): void;

  /** Register a mutator */
  public addMutator<K extends keyof T>(attribute: K, fn: (value: T[K]) => unknown): void;
}

/**
 * Static methods for model operations
 */
export declare class IStaticBaseModel {

  /**
   * @param attributes Attributes to create a new model instance
   */
  public static create(attributes: Record<string, unknown>): boolean;
}