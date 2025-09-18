import {
  AccessorMap,
  ModelAttributes,
  PHPTimestampFormat,
} from "../../../../../@types/declaration/Base/IBaseModel.d.ts";
import { Carbon } from "honovel:helpers";
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
export abstract class Model<T extends ModelAttributes = ModelAttributes> {
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

  private _connection?: string;

  public getConnection(): string {
    const connection = this._connection || this._defaultConnection;
    return connection;
  }

  public setConnection(connection: string): this {
    if (!DB.hasConnection(connection)) {
      throw new Error(`Database connection "${connection}" does not exist.`);
    }
    this._connection = connection;
    return this;
  }

  public getKeyName(): string {
    return (this.constructor as typeof Model)._primaryKey;
  }

  public getKey(): string | number {
    return this._attributes[(this.constructor as typeof Model)._primaryKey] as
      | string
      | number;
  }

  public usesTimestamps(): boolean {
    return (this.constructor as typeof Model)._timeStamps;
  }

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

  public getAttributes(): Record<string, unknown> {
    const keys = Object.keys(this._attributes);
    const data: Record<string, unknown> = {};
    for (const key of keys) {
      data[key] = this.getAttribute(key);
    }
    return data;
  }

  public setAttribute<K extends keyof T>(key: K, value: T[K]): void {
    if (
      isset((this.constructor as typeof Model)._guarded) &&
      keyExist((this.constructor as typeof Model)._guarded, key)
    ) {
      throw new Error(
        `Attribute "${String(key)}" is guarded and cannot be set.`
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

  public fill(attributes: Partial<T>): this {
    const fillable = [...(this.constructor as typeof Model)._fillable];
    const guarded = [...(this.constructor as typeof Model)._guarded];
    fillable.push((this.constructor as typeof Model)._primaryKey);
    if (this.usesTimestamps()) {
      fillable.push(
        (this.constructor as typeof Model).createdAtColumn,
        (this.constructor as typeof Model).updatedAtColumn
      );
    }
    if (isset(fillable) && fillable.length > 0) {
      for (const [key, value] of Object.entries(attributes)) {
        if (fillable.includes(String(key))) {
          this.setAttribute(key as keyof T, value as T[keyof T]);
        } else {
          // ignore the attribute if not fillable
        }
      }
    } else {
      if (!isset(guarded) || !guarded.length) {
        throw new Error(
          `No fillable attributes defined for model ${this.constructor.name}.`
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

  public forceFill(attributes: T): this {
    for (const [key, value] of Object.entries(attributes)) {
      // @ts-ignore //
      this.setAttribute(key, value);
    }
    return this; // 🔁 Return the same instance to allow chaining
  }

  public toObject(): Record<Array<string>[number], unknown> {
    const data = { ...this._attributes };

    if ((this.constructor as typeof Model)._visible.length) {
      const visibleData = {} as Record<Array<string>[number], unknown>;
      for (const key of (this.constructor as typeof Model)._visible) {
        if (keyExist(data, key)) {
          visibleData[key] = data[key];
        }
      }
      return visibleData;
    }

    if ((this.constructor as typeof Model)._hidden.length) {
      for (const key of (this.constructor as typeof Model)._hidden) {
        delete data[key];
      }
    }

    return data;
  }

  public toJSON(): string {
    return jsonEncode(this.toObject());
  }

  public hasCast(attribute: string): boolean {
    return keyExist((this.constructor as typeof Model)._casts, attribute);
  }

  public getRawAttributes(): Record<string, unknown> {
    return { ...this._attributes };
  }

  public getRawAttribute<K extends keyof T>(key: K): T[K] | null {
    return this._attributes[key] ?? null;
  }

  public softDelete(): this {
    if (!(this.constructor as typeof Model)._softDelete) {
      throw new Error("Soft delete is not enabled for this model.");
    }
    // @ts-ignore //
    this.setAttribute("_deletedAtColumn", date("Y-m-d H:i:s"));
    return this;
  }

  public restore(): this {
    if (!(this.constructor as typeof Model)._softDelete) {
      throw new Error("Soft delete is not enabled for this model.");
    }
    // @ts-ignore //
    this.setAttribute(this.getDeletedAtColumn(), null);
    return this;
  }

  public isTrashed(): boolean {
    if (!(this.constructor as typeof Model)._softDelete) {
      throw new Error("Soft delete is not enabled for this model.");
    }
    return (
      this.getAttribute((this.constructor as typeof Model)._deletedAtColumn) !==
      null
    );
  }

  public getDeletedAtColumn(): string {
    return (this.constructor as typeof Model)._deletedAtColumn;
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
    (this.constructor as typeof Model)._accessors[String(attribute)] = fn;
    if (!Object.prototype.hasOwnProperty.call(this, attribute)) {
      Object.defineProperty(this, attribute, {
        get: () => {
          const raw = this._attributes[attribute] ?? null;
          if (
            keyExist(
              (this.constructor as typeof Model)._accessors,
              attribute
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

  public addMutator<K extends keyof T>(
    attribute: K,
    fn: (value: T[K]) => unknown
  ): void {
    if (typeof fn !== "function") {
      throw new Error("Mutator must be a function.");
    }
    (this.constructor as typeof Model)._mutators[String(attribute)] = fn as (
      value: unknown
    ) => unknown;
  }

  public static on(db?: string): Builder {
    if (!isset(db)) {
      // @ts-ignore //
      const instanceModel = new this() as Model<ModelAttributes>;
      db = instanceModel.getConnection();
    }
    return new Builder(
      {
        model: this,
        fields: ["*"],
      },
      db
    ) as Builder<ModelAttributes, typeof Model<ModelAttributes>>;
  }

  public static async create<Attr extends Record<string, unknown>>(
    attributes?: Attr
  ) {
    // @ts-ignore //
    const instance = new this(attributes) as Model<ModelAttributes>;
    await instance.save();
    return instance;
  }

  // Never use this in production code, it's for development CLI only.
  public static async factory(connection: string): Promise<Factory> {
    if (!isset(this.use)) {
      throw new Error("This model does not support factories.");
    }
    if (!isset(this.use["HasFactory"])) {
      throw new Error("This model does not support factories.");
    }
    if (!isset(connection)) {
      throw new Error("Connection must be specified for factory.");
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

  // separated with dot
  public static with(modelActions: string) {
    const separateActions = modelActions.split("."); // ["posts", "comments"]
    const actionFields = separateActions.map((action) => {
      const [a, fields = "*"] = action.split(":");
      return { action: a, fields };
    });
    const actions = actionFields.map((item) => item.action);
    const fields = actionFields.map((item) => item.fields.split(","));

    return new WithBuilder(this, actions, fields);
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
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereIn(column, values);
  }

  public static whereNotIn(
    column: string,
    values: unknown[]
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNotIn(column, values);
  }

  public static whereNull(
    column: string
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNull(column);
  }

  public static whereNotNull(
    column: string
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNotNull(column);
  }

  public static whereBetween(
    column: string,
    values: [unknown, unknown]
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereBetween(column, values);
  }

  public static whereNotBetween(
    column: string,
    values: [unknown, unknown]
  ): Builder<ModelAttributes, typeof Model<ModelAttributes>> {
    return new Builder({
      model: this,
      fields: ["*"],
    }).whereNotBetween(column, values);
  }

  public static async all<
    T extends Model<ModelAttributes> = Model<ModelAttributes>
  >(): Promise<T[]> {
    return await new Builder({
      model: this,
      fields: ["*"],
    }).get<T>();
  }

  public static async first(): Promise<InstanceType<
    typeof Model<ModelAttributes>
  > | null> {
    return await new Builder({
      model: this,
      fields: ["*"],
    }).first();
  }

  public static async find<
    M extends Model<ModelAttributes> = Model<ModelAttributes>
  >(id: string | number): Promise<M | null> {
    // @ts-ignore //
    const instanceModel = new this() as Model<ModelAttributes>;
    const primaryKey = instanceModel.getKeyName();
    return (await new Builder({
      model: this,
      fields: ["*"],
    })
      .where(primaryKey, id)
      .first()) as unknown as M;
  }

  public static async findOrFail<
    M extends Model<ModelAttributes> = Model<ModelAttributes>
  >(id: string | number): Promise<M> {
    try {
      const record = await this.find<M>(id);
      if (!record) {
        throw new Error(
          `${this.name} with primary key "${id}" not found in the database.`
        );
      }
      return record;
    } catch (error) {
      throw error;
    }
  }

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
      await DB.connection(this._connection).update(tableName, data, {
        // @ts-ignore //
        [primaryKey]: this[primaryKey],
      });
    } else {
      // Create new record
      await DB.connection(this._connection).insert(tableName, data);
    }
  }

  public hasMany(
    relationModel: typeof Model<ModelAttributes>,
    foreignKey?: string
  ) {
    if (!foreignKey) {
      const primaryKey = this.getKeyName();
      foreignKey = `${this.getTableName()}_${primaryKey}`;
    }
    const primaryValue = this.getKey();
    if (!isset(primaryValue)) {
      throw new Error(
        `Model ${this.constructor.name} does not have a primary key set.`
      );
    }
    return new Builder({
      model: relationModel,
      fields: ["*"],
    }).where(foreignKey, this.getKey());
  }

  public hasVerifiedEmail(): boolean {
    const emailVerifiedAt = this.getRawAttribute("email_verified_at");
    return emailVerifiedAt !== null;
  }
}

import { Builder as RawBuilder, sqlstring } from "../Query/index.ts";
import { Factory, HasFactory } from "./Factories/index.ts";

export class Builder<
  B extends ModelAttributes = ModelAttributes,
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
  public override async get<
    B extends InstanceType<T> = InstanceType<T>
  >(): Promise<B[]> {
    const data = await super.get();
    // @ts-ignore //
    return data.map((item) => new this.model(item as B));
  }
}

class WithBuilder {
  constructor(
    private model: typeof Model<ModelAttributes>,
    private actions: string[],
    private fields: string[][]
  ) {}

  async get() {
    const allThisData = (await this.model.all()).map((item) => item.toObject());
    if (!allThisData.length) return allThisData;

    const currentLevel = {
      data: [allThisData],
      model: this.model,
    };

    await this.iterateWith(currentLevel, [...this.actions], [...this.fields]);

    return allThisData;
  }

  async first() {
    const allThisData = (await this.model.first())?.toObject();
    if (!allThisData) return null;
    const currentLevel = {
      data: [[allThisData]],
      model: this.model,
    };
    await this.iterateWith(currentLevel, [...this.actions], [...this.fields]);
    return allThisData;
  }

  private async iterateWith(
    currentLevel: {
      data: Record<string, unknown>[][];
      model: typeof Model<ModelAttributes>;
    },
    actions: string[],
    fields: string[][]
  ) {
    while (actions.length > 0 && currentLevel.data.length > 0) {
      const action = actions.shift();
      const fieldsForAction = fields.shift() || ["*"];
      if (!action) break;
      const nextLevel: {
        data: Record<string, unknown>[][];
        model: typeof Model<ModelAttributes>;
      } = {
        data: [],
        model: null as unknown as typeof Model<ModelAttributes>,
      };
      for (const items of currentLevel.data) {
        for (const item of items) {
          // @ts-ignore //
          const instance = new currentLevel.model(
            item
          ) as Model<ModelAttributes>;
          if (methodExist(instance, action)) {
            const relatedData = (instance as any)[action]() as Builder;
            if (relatedData instanceof Builder) {
              const relatedItems = await relatedData
                .select(...fieldsForAction)
                .get();
              if (relatedItems.length > 0) {
                item[action] = relatedItems.map((relatedItem) => {
                  return relatedItem.toObject();
                });
                nextLevel.data.push([
                  ...(item[action] as Record<string, unknown>[]),
                ]);
                // @ts-ignore //
                nextLevel.model = relatedData.model;
              }
            }
          }
        }
      }
      currentLevel.data = nextLevel.data;
      currentLevel.model = nextLevel.model;
    }
  }
}
