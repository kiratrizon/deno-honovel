/**
 * Interface/Base class emulating Laravel's Eloquent Model behavior
 */
declare class IBaseModel {
  /**
   * Whether to automatically manage created_at and updated_at timestamps.
   * Default in Laravel: true
   */
  protected _timestamps: boolean;

  /**
   * The name of the table associated with the model.
   * If not set, Laravel uses the plural snake_case form of the class name.
   */
  protected _table?: string;

  /**
   * The primary key for the model.
   * Default: 'id'
   */
  protected _primaryKey: string;

  /**
   * Indicates if the IDs are auto-incrementing.
   * Default: true
   */
  protected _incrementing: boolean;

  /**
   * The data type of the primary key.
   * Common values: 'int', 'string', 'uuid'
   */
  protected _keyType: "int" | "string" | "uuid";

  /**
   * Whether the model should be timestamped.
   * Shortcut alias for _timestamps (for Laravel naming match).
   */
  protected timestamps: boolean;

  /**
   * The attributes that aren't mass assignable.
   * Equivalent to Laravel's `$guarded`.
   */
  protected _guarded: string[];

  /**
   * The attributes that are mass assignable.
   * Equivalent to Laravel's `$fillable`.
   */
  protected _fillable: string[];

  /**
   * Attributes that should be hidden for arrays/JSON.
   * Equivalent to Laravel's `$hidden`.
   */
  protected _hidden: string[];

  /**
   * Attributes that should be visible in arrays/JSON.
   * Equivalent to Laravel's `$visible`.
   */
  protected _visible: string[];

  /**
   * The storage format of the model's date columns.
   * Default: 'YYYY-MM-DD HH:mm:ss'
   */
  protected _dateFormat: string;

  /**
   * The model's default attribute values.
   * Equivalent to Laravel's `$attributes` or `$casts`.
   */
  protected _attributes: Record<string, unknown>;

  /**
   * The model's attribute casting definitions.
   * Equivalent to Laravel's `$casts`.
   * Example: { is_active: 'boolean', created_at: 'datetime' }
   */
  protected _casts: Record<
    string,
    "string" | "int" | "boolean" | "datetime" | "array"
  >;

  /**
   * The names of the "created at" and "updated at" columns.
   * Default: ['created_at', 'updated_at']
   */
  protected _timestampsFields: [string, string];

  /**
   * Indicates if the model should be soft deleted.
   * (uses a `deleted_at` column)
   */
  protected _softDelete: boolean;

  /**
   * The name of the "deleted at" column used for soft deletes.
   */
  protected _deletedAtColumn: string;
}

export default IBaseModel;
