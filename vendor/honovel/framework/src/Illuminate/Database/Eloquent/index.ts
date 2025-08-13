import {
  AccessorMap,
  IBaseModelProperties,
  PHPTimestampFormat,
} from "../../../../../@types/declaration/Base/IBaseModel.d.ts";
import { DB } from "../../Support/Facades/index.ts";

export type ModelWithAttributes<
  T extends Record<string, unknown>,
  C extends new (attr: T) => unknown
> = (new (...args: ConstructorParameters<C>) => InstanceType<C> & T) & C;

export function schemaKeys<T extends Record<string, unknown>>(
  keys: (keyof T)[]
) {
  return keys;
}
export abstract class Model<
  T extends IBaseModelProperties = IBaseModelProperties
> {
  static use: Record<string, unknown> = {};

  protected _timeStamps: boolean = true;

  protected _table?: string;

  protected _primaryKey: string = "id";

  protected _incrementing: boolean = true;

  protected _keyType: "int" | "string" | "uuid" = "int";

  protected abstract _fillable?: (keyof T | string)[];
  protected abstract _guarded?: (keyof T | string)[];

  protected _hidden: Array<string> = [];

  protected _visible: Array<string> = [];

  protected _dateFormat: PHPTimestampFormat = "Y-m-d H:i:s";

  protected _attributes: T = {} as T;

  protected _connection: string = DB.getDefaultConnection();

  protected _casts: Record<
    keyof T,
    "string" | "boolean" | "object" | "int" | "array"
  > = {} as Record<keyof T, "string" | "boolean" | "object" | "int" | "array">;

  protected _timestampsFields: [string, string] = ["created_at", "updated_at"];

  protected _softDelete: boolean = false;

  protected _deletedAtColumn: string = "deleted_at";

  protected _accessors: AccessorMap<T> = {};

  protected _mutators: AccessorMap<T> = {};

  public getTableName(): string {
    if (this._table) {
      return this._table;
    }
    return generateTableName(this.constructor.name);
  }

  public getConnection(): string {
    return this._connection;
  }

  public setConnection(connection: string): this {
    if (!DB.hasConnection(connection)) {
      throw new Error(`Database connection "${connection}" does not exist.`);
    }
    this._connection = connection;
    return this;
  }

  public getKeyName(): string {
    return this._primaryKey;
  }

  public getKey(): string | number {
    return this._attributes[this._primaryKey] as string | number;
  }

  public usesTimestamps(): boolean {
    return this._timeStamps;
  }

  public getAttribute<K extends keyof T>(key: K): T[K] | null {
    let value: unknown = this._attributes[key] ?? null;

    const cast = this._casts?.[key];
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

    const accessor = this._accessors?.[key];
    if (isset(accessor) && isFunction(accessor)) {
      value = accessor(value);
    }
    return value as T[K] | null;
  }

  public getAttributes(): Record<string, unknown> {
    const keys = Object.keys(this._attributes);
    const data: Record<string, unknown> = {};
    for (const key of keys) {
      data[key] = this.getAttribute(key);
    }
    return data;
  }

  public setAttribute<K extends keyof T>(key: K, value: T[K]): void {
    if (isset(this._guarded) && keyExist(this._guarded, key)) {
      throw new Error(
        `Attribute "${String(key)}" is guarded and cannot be set.`
      );
    }
    if (keyExist(this._mutators, key) && isFunction(this._mutators[key])) {
      value = this._mutators[key](value) as T[K];
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

  public fill(attributes: Partial<T>): this {
    // console.log("Filling attributes:", this._fillable);
    if (isset(this._fillable) && this._fillable.length > 0) {
      for (const [key, value] of Object.entries(attributes)) {
        if (this._fillable.includes(key as keyof T)) {
          this.setAttribute(key as keyof T, value as T[keyof T]);
        } else {
          throw new Error(`Attribute "${key}" is not fillable.`);
        }
      }
    } else {
      if (!isset(this._guarded) || !this._guarded.length) {
        throw new Error(
          `No fillable attributes defined for model ${this.constructor.name}.`
        );
      }
      for (const [key, value] of Object.entries(attributes)) {
        if (isset(this._guarded) && !this._guarded.includes(key as string)) {
          this.setAttribute(key as keyof T, value as T[keyof T]);
        } else {
          throw new Error(`Attribute "${key}" is guarded and cannot be set.`);
        }
      }
    }
    return this;
  }

  public forceFill(attributes: T): this {
    for (const [key, value] of Object.entries(attributes)) {
      // @ts-ignore //
      this.setAttribute(key, value);
    }
    return this; // 🔁 Return the same instance to allow chaining
  }

  public toObject(): Record<Array<string>[number], unknown> {
    const data = { ...this._attributes };

    if (this._visible.length) {
      const visibleData = {} as Record<Array<string>[number], unknown>;
      for (const key of this._visible) {
        if (keyExist(data, key)) {
          visibleData[key] = data[key];
        }
      }
      return visibleData;
    }

    if (this._hidden.length) {
      for (const key of this._hidden) {
        delete data[key];
      }
    }

    return data;
  }

  public toJSON(): string {
    return jsonEncode(this.toObject());
  }

  public hasCast(attribute: string): boolean {
    return keyExist(this._casts, attribute);
  }

  public getRawAttributes(): Record<string, unknown> {
    return { ...this._attributes };
  }

  public softDelete(): this {
    if (!this._softDelete) {
      throw new Error("Soft delete is not enabled for this model.");
    }
    // @ts-ignore //
    this.setAttribute("_deletedAtColumn", date("Y-m-d H:i:s"));
    return this;
  }

  public restore(): this {
    if (!this._softDelete) {
      throw new Error("Soft delete is not enabled for this model.");
    }
    // @ts-ignore //
    this.setAttribute("_deletedAtColumn", null);
    return this;
  }

  public isTrashed(): boolean {
    if (!this._softDelete) {
      throw new Error("Soft delete is not enabled for this model.");
    }
    return this.getAttribute(this._deletedAtColumn) !== null;
  }

  public getDeletedAtColumn(): string {
    return this._deletedAtColumn;
  }

  public serializeDate(format: PHPTimestampFormat = "Y-m-d H:i:s"): string {
    return date(format);
  }

  public addAccessor(
    attribute: keyof T,
    fn: (value: T[keyof T]) => unknown
  ): void {
    if (!isFunction(fn)) {
      throw new Error("Accessor must be a function.");
    }
    this._accessors[attribute] = fn;
    if (!Object.prototype.hasOwnProperty.call(this, attribute)) {
      Object.defineProperty(this, attribute, {
        get: () => {
          const raw = this._attributes[attribute] ?? null;
          if (
            keyExist(this._accessors, attribute) &&
            isFunction(this._accessors[attribute])
          ) {
            return this._accessors[attribute](raw);
          } else {
            return raw;
          }
        },
        configurable: true,
        enumerable: true,
      });
    }
  }

  public addMutator<K extends keyof T>(
    attribute: K,
    fn: (value: T[K]) => unknown
  ): void {
    if (typeof fn !== "function") {
      throw new Error("Mutator must be a function.");
    }
    this._mutators[attribute] = fn;
  }

  public static on(db: string = DB.getDefaultConnection()): Builder {
    return new Builder(
      {
        model: this,
        fields: ["*"],
      },
      db
    ) as Builder<IBaseModelProperties, typeof Model<IBaseModelProperties>>;
  }

  public static async create<Attr extends Record<string, unknown>>(
    attributes?: Attr
  ) {
    // @ts-ignore //
    const instance = new this(attributes);
    await instance.save();
    return instance;
  }

  // Never use this in production code, it's for development CLI only.
  public static async factory(connection: string): Promise<Factory> {
    if (!isset(this.use["HasFactories"])) {
      throw new Error("This model does not support factories.");
    }
    if (!isset(connection)) {
      throw new Error("Connection must be specified for factory.");
    }
    if (!DB.hasConnection(connection)) {
      throw new Error(`Database connection "${connection}" does not exist.`);
    }
    const factoryClass = this.use["HasFactories"] as typeof HasFactory;

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

  public static where(column: string, value: unknown): Builder {
    return new Builder({
      model: this,
      fields: ["*"],
    }).where(column, value);
  }

  public static whereIn(
    column: string,
    values: unknown[]
  ): Builder<IBaseModelProperties, typeof Model<IBaseModelProperties>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereIn(column, values);
  }

  public static whereNotIn(
    column: string,
    values: unknown[]
  ): Builder<IBaseModelProperties, typeof Model<IBaseModelProperties>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNotIn(column, values);
  }

  public static whereNull(
    column: string
  ): Builder<IBaseModelProperties, typeof Model<IBaseModelProperties>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNull(column);
  }

  public static whereNotNull(
    column: string
  ): Builder<IBaseModelProperties, typeof Model<IBaseModelProperties>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNotNull(column);
  }

  public static whereBetween(
    column: string,
    values: [unknown, unknown]
  ): Builder<IBaseModelProperties, typeof Model<IBaseModelProperties>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereBetween(column, values);
  }

  public static whereNotBetween(
    column: string,
    values: [unknown, unknown]
  ): Builder<IBaseModelProperties, typeof Model<IBaseModelProperties>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNotBetween(column, values);
  }

  public static async all(): Promise<
    InstanceType<typeof Model<IBaseModelProperties>>[]
  > {
    return await new Builder({
      model: this,
      fields: ["*"],
    }).get();
  }

  public static async first(): Promise<InstanceType<
    typeof Model<IBaseModelProperties>
  > | null> {
    return await new Builder({
      model: this,
      fields: ["*"],
    }).first();
  }

  public static async find(id: string | number) {
    // @ts-ignore //
    const instanceModel = new this() as Model<IBaseModelProperties>;
    const primaryKey = instanceModel.getKeyName();
    return await new Builder({
      model: this,
      fields: ["*"],
    })
      .where(primaryKey, id)
      .first();
  }

  async save() {
    const data = this.getRawAttributes();
    const tableName = this.getTableName();
    const primaryKey = this.getKeyName();

    // @ts-ignore //
    if (this[primaryKey]) {
      // Update existing record
      // @ts-ignore //
      await DB.connection(this._connection).update(tableName, data, {
        // @ts-ignore //
        [primaryKey]: this[primaryKey],
      });
    } else {
      // Create new record
      await DB.connection(this._connection).insert(tableName, data);
    }
  }
}

import { Builder as RawBuilder, sqlstring } from "../Query/index.ts";
import { Factory, HasFactory } from "./Factories/index.ts";

export class Builder<
  B extends IBaseModelProperties = IBaseModelProperties,
  T extends typeof Model<B> = typeof Model<B>
> extends RawBuilder {
  protected model: T;
  constructor(
    { model, fields = ["*"] }: { model: T; fields?: sqlstring[] },
    db?: string
  ) {
    // @ts-ignore //
    const instanceModel = new model();
    const table = instanceModel.getTableName();
    const dbUsed = db || instanceModel.getConnection();
    super({ table, fields }, dbUsed);
    this.model = model;
  }

  // @ts-ignore //
  public override async first(): Promise<InstanceType<T> | null> {
    const data = await super.first();
    if (!data) return null;
    // @ts-ignore //
    return new this.model(data as B) as InstanceType<T>;
  }

  // @ts-ignore //
  public override async get(): Promise<InstanceType<T>[]> {
    const data = await super.get();
    // @ts-ignore //
    return data.map((item) => new this.model(item as B) as InstanceType<T>);
  }
}
