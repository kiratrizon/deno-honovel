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
