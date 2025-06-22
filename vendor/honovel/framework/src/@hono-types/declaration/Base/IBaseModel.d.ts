export type PHPTimestampFormat =
  | "Y-m-d H:i:s"
  | "Y-m-d\\TH:i:sP"
  | "Y-m-d\\TH:i:sO";

export type AccessorMap<T extends Record<string, unknown>> = {
  [K in keyof T]?: (value: T[K]) => unknown;
};

export type FieldsPopulate<T extends Record<string, any>> = (keyof T | string)[];


type Attr = Record<string, unknown>;

export interface IBaseModelProperties {
  _attributes: Attr;
}



export type ModelWithAttributes<
  T extends Record<string, any>,
  C extends new (...args: any[]) => any = any
> = (new (...args: ConstructorParameters<C>) => InstanceType<C> & T) & C;

export type CastType = "string" | "int" | "boolean" | "array" | "object";
/**
 * Interface/Base class emulating Laravel's Eloquent Model behavior.
 */
export interface IBaseModelInterface<T extends IBaseModelProperties> {
  // -------- Methods --------
  getTableName(): string;
  getKeyName(): string;
  getKey(): string | number;
  usesTimestamps(): boolean;
  getAttribute<K extends keyof T["_attributes"]>(key: K): T["_attributes"][K] | null;
  setAttribute<K extends keyof T["_attributes"]>(key: K, value: T["_attributes"][K]): void;
  fill(attributes: Record<keyof T["_attributes"], unknown>): this;
  forceFill(attributes: Record<string, unknown>): this;
  toJSON(): Record<string, unknown>;
  toObject(): Record<string, unknown>;
  hasCast(attribute: string): boolean;
  getRawAttributes(): Record<string, unknown>;
  getAttributes(): Record<string, unknown>;
  softDelete(): this;
  restore(): this;
  isTrashed(): boolean;
  getDeletedAtColumn(): string;
  serializeDate(format: PHPTimestampFormat): string;
  addAccessor(attribute: string, fn: (value: T["_attributes"][keyof T["_attributes"]]) => unknown): void;
  addMutator(attribute: string, fn: (value: T["_attributes"][keyof T["_attributes"]]) => unknown): void;
}

/**
 * Static methods for model operations
 */
export declare class IStaticBaseModel {

  /**
   * @param attributes Attributes to create a new model instance
   */
  public static create(attributes: Record<string, unknown>): Promise<boolean>;
}