import { SupportedDrivers } from "configs/@types/index.d.ts";
import IBaseModel, {
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
export class Model<T extends IBaseModelProperties> {
  constructor(attributes: T["_attributes"] = {} as T["_attributes"]) {
    for (const key of Object.keys(attributes) as (keyof T["_attributes"])[]) {
      this.setAttribute(key, attributes[key]);
    }
  }
  protected _timeStamps: boolean = true;

  protected _table?: string;

  protected _primaryKey: string = "id";

  protected _incrementing: boolean = true;

  protected _keyType: "int" | "string" | "uuid" = "int";

  protected _fillable: (keyof T["_attributes"])[] = [];
  protected _guarded: (keyof T["_attributes"])[] = [];

  protected _hidden: Array<string> = [];

  protected _visible: Array<string> = [];

  protected _dateFormat: PHPTimestampFormat = "Y-m-d H:i:s";

  protected _attributes: T["_attributes"] = {};

  protected _connection: string = DB.getDefaultConnection();

  protected _casts: Record<
    keyof T["_attributes"],
    "string" | "boolean" | "object" | "int" | "array"
  > = {} as Record<
    keyof T["_attributes"],
    "string" | "boolean" | "object" | "int" | "array"
  >;

  protected _timestampsFields: [string, string] = ["created_at", "updated_at"];

  protected _softDelete: boolean = false;

  protected _deletedAtColumn: string = "deleted_at";

  protected _accessors: AccessorMap<T["_attributes"]> = {};

  protected _mutators: AccessorMap<T["_attributes"]> = {};

  public getTableName(): string {
    if (this._table) {
      return this._table;
    }
    const className = this.constructor.name.replace(/^Base/, "");
    return generateTableName(className);
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

  public getAttribute<K extends keyof T["_attributes"]>(
    key: K
  ): T["_attributes"][K] | null {
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
    return value as T["_attributes"][K] | null;
  }

  public getAttributes(): Record<string, unknown> {
    const keys = Object.keys(this._attributes);
    const data: Record<string, unknown> = {};
    for (const key of keys) {
      data[key] = this.getAttribute(key);
    }
    return data;
  }

  public setAttribute<K extends keyof T["_attributes"]>(
    key: K,
    value: T["_attributes"][K]
  ): void {
    if (isset(this._guarded) && keyExist(this._guarded, key)) {
      throw new Error(
        `Attribute "${String(key)}" is guarded and cannot be set.`
      );
    }
    if (keyExist(this._mutators, key) && isFunction(this._mutators[key])) {
      value = this._mutators[key](value) as T["_attributes"][K];
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

  public fill(attributes: T["_attributes"]): this {
    if (isset(this._fillable) && this._fillable.length > 0) {
      for (const key of this._fillable) {
        if (key in attributes) {
          this.setAttribute(key, attributes[key]);
        }
      }
    } else {
      for (const [key, value] of Object.entries(attributes)) {
        if (isset(this._guarded) && !this._guarded.includes(key as string)) {
          this.setAttribute(
            key as keyof T["_attributes"],
            value as T["_attributes"][keyof T["_attributes"]]
          );
        } else {
          throw new Error(`Attribute "${key}" is guarded and cannot be set.`);
        }
      }
    }
    return this;
  }

  public forceFill(attributes: T["_attributes"]): this {
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
    attribute: keyof T["_attributes"],
    fn: (value: T["_attributes"][keyof T["_attributes"]]) => unknown
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

  public addMutator<K extends keyof T["_attributes"]>(
    attribute: K,
    fn: (value: T["_attributes"][K]) => unknown
  ): void {
    if (typeof fn !== "function") {
      throw new Error("Mutator must be a function.");
    }
    this._mutators[attribute] = fn;
  }

  public static on(db: string = DB.getDefaultConnection()): Builder {
    return new Builder(
      {
        model: this as unknown as typeof IBaseModel,
        fields: ["*"],
      },
      db
    ) as Builder<IBaseModelProperties, typeof IBaseModel<IBaseModelProperties>>;
  }

  public static create<Attr extends Record<string, unknown>>(
    attributes?: Attr
  ): boolean {
    return true;
  }

  public static async find(id: string | number) {
    const model = new this();
    const tableName = model.getTableName();
    const primaryKey = model.getKeyName();
    const data = await DB.select(
      `SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`,
      [id]
    );
    if (data.length === 0) {
      return null;
    }
    return model.fill(data[0]);
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

export class Builder<
  B extends IBaseModelProperties = IBaseModelProperties,
  T extends typeof IBaseModel<B> = typeof IBaseModel<B>
> extends RawBuilder {
  protected model: T;
  constructor(
    {
      model,
      fields = ["*"],
    }: {
      model: T;
      fields?: sqlstring[];
    },
    dbUsed: string = DB.getDefaultConnection()
  ) {
    const table = new model().getTableName();
    super({ table, fields }, dbUsed);
    this.model = model;
  }

  // @ts-ignore //
  public override async first(): Promise<InstanceType<T> | null> {
    const data = await super.first();
    if (!data) return null;
    return new this.model(data) as InstanceType<T>;
  }

  // @ts-ignore //
  public override async get(): Promise<InstanceType<T>[]> {
    const data = await super.get();
    return data.map((item) => new this.model(item) as InstanceType<T>);
  }
}
