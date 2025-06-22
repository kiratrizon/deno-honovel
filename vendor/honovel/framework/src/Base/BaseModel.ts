import { AccessorMap, PHPTimestampFormat, IStaticBaseModel, IBaseModelProperties, CastType, ModelWithAttributes, IBaseModelInterface, FieldsPopulate } from "../@hono-types/declaration/Base/IBaseModel.d.ts";
import { staticImplements } from "../framework-utils/index.ts";

/**
 * Abstract base model that defines the structure and behavior of a model class.
 * Designed to be extended by concrete model classes (e.g., User, Post).
 * Inspired by Laravel's Eloquent ORM system.
 */
abstract class AbsBaseModel<T extends IBaseModelProperties> {
    /**
     * Construct a new model instance.
     * Concrete implementations should handle initial attribute setup if needed.
     */
    constructor() { }

    // -------- Attributes --------

    /** Whether timestamps (created_at, updated_at) are maintained automatically */
    protected abstract _timeStamps: boolean;

    /** The name of the database table associated with the model */
    protected abstract _table?: string;

    /** The name of the primary key column (defaults to 'id') */
    protected abstract _primaryKey: string;

    /** Whether the primary key is auto-incrementing */
    protected abstract _incrementing: boolean;

    /** The type of primary key: 'int', 'string', or 'uuid' */
    protected abstract _keyType: "int" | "string" | "uuid";

    /** Attributes that cannot be mass assigned (like `$guarded` in Laravel) */
    protected abstract _guarded: FieldsPopulate<T["_attributes"]>;

    /** Attributes that can be mass assigned (like `$fillable` in Laravel) */
    protected abstract _fillable: FieldsPopulate<T["_attributes"]>;

    /** Attributes that should be hidden from JSON and array outputs */
    protected abstract _hidden: FieldsPopulate<T["_attributes"]>;

    /** Attributes that should be visible in JSON and array outputs */
    protected abstract _visible: FieldsPopulate<T["_attributes"]>;

    /** The format used for timestamps (e.g., 'Y-m-d H:i:s') */
    protected abstract _dateFormat: PHPTimestampFormat;

    /** The actual model attributes (e.g., database columns) */
    protected abstract _attributes: T["_attributes"] | Record<string, unknown>;

    /** Attribute casting map (e.g., { active: 'boolean' }) */
    protected abstract _casts: Record<string, CastType>;

    /** Names of the timestamp fields, defaulting to ['created_at', 'updated_at'] */
    protected abstract _timestampsFields: [string, string];

    /** Whether soft deletes are enabled (uses a deleted_at column) */
    protected abstract _softDelete: boolean;

    /** The name of the column used for soft deletes (e.g., 'deleted_at') */
    protected abstract _deletedAtColumn: string;

    /** Map of attribute accessors, which modify values when accessed */
    protected abstract _accessors: AccessorMap<T["_attributes"]>;

    /** Map of attribute mutators, which modify values before they are stored */
    protected abstract _mutators: AccessorMap<T["_attributes"]>;

    // -------- Methods --------

    /** Get the name of the table associated with the model */
    public abstract getTableName(): string;

    /** Get the name of the model's primary key */
    public abstract getKeyName(): string;

    /** Get the value of the model's primary key */
    public abstract getKey(): string | number;

    /** Determine whether the model uses timestamps */
    public abstract usesTimestamps(): boolean;

    /** Get the value of a given attribute */
    public abstract getAttribute<K extends keyof T["_attributes"]>(key: K): T["_attributes"][K] | null;

    /** Set the value of a given attribute (with mutators applied) */
    public abstract setAttribute<K extends keyof T["_attributes"]>(key: K, value: T["_attributes"][K]): void;

    /** Mass assign attributes (respects fillable/guarded rules) */
    public abstract fill(attributes: Record<keyof T["_attributes"], unknown>): this;

    /** Force mass assign attributes (ignores fillable/guarded rules) */
    public abstract forceFill(attributes: Record<string, unknown>): this;

    /** Convert the model to a plain object */
    public abstract toObject(): Record<string, unknown>;

    /** Convert the model to a JSON-compatible representation */
    public abstract toJSON(): string;

    /** Check if the given attribute has a defined cast */
    public abstract hasCast(attribute: string): boolean;

    /** Get the raw attributes without casting or accessors */
    public abstract getRawAttributes(): Record<string, unknown>;

    /** Get all attributes (processed via accessors and casting) */
    public abstract getAttributes(): Record<string, unknown>;

    /** Soft delete the model (sets deleted_at) */
    public abstract softDelete(): this;

    /** Restore a soft-deleted model */
    public abstract restore(): this;

    /** Check whether the model has been soft deleted */
    public abstract isTrashed(): boolean;

    /** Get the name of the deleted_at column */
    public abstract getDeletedAtColumn(): string;

    /** Serialize a date value using the model's date format */
    public abstract serializeDate(format: PHPTimestampFormat): string;

    /**
     * Register a new accessor for a given attribute
     * @param attribute - The attribute key
     * @param fn - A function that transforms the value before returning it
     */
    public abstract addAccessor(
        attribute: string,
        fn: (value: T["_attributes"][keyof T["_attributes"]]) => unknown
    ): void;

    /**
     * Register a new mutator for a given attribute
     * @param attribute - The attribute key
     * @param fn - A function that transforms the value before saving it
     */
    public abstract addMutator(
        attribute: string,
        fn: (value: T["_attributes"][keyof T["_attributes"]]) => unknown
    ): void;

}


@staticImplements<IStaticBaseModel>()
class BaseModel<
    T extends IBaseModelProperties
> extends AbsBaseModel<T> {
    constructor(attributes?: T["_attributes"]) {
        super();
        if (attributes) {
            this.fill(attributes);
        }
    }

    protected _timeStamps: boolean = true;

    protected _table?: string;

    protected _primaryKey: string = 'id';

    protected _incrementing: boolean = true;

    protected _keyType: "int" | "string" | "uuid" = "int";

    protected _guarded: string[] = [];

    protected _fillable: FieldsPopulate<T["_attributes"]> = [];

    protected _hidden: Array<string> = [];

    protected _visible: Array<string> = [];

    protected _dateFormat: PHPTimestampFormat = "Y-m-d H:i:s";

    protected _attributes: T["_attributes"] = {};

    protected _casts: Record<
        keyof T["_attributes"],
        "string" | "boolean" | "object" | "int" | "array"
    > = {} as Record<keyof T["_attributes"], "string" | "boolean" | "object" | "int" | "array">;

    protected _timestampsFields: [string, string] = ["created_at", "updated_at"];

    protected _softDelete: boolean = false;

    protected _deletedAtColumn: string = "deleted_at";

    protected _accessors: AccessorMap<T["_attributes"]> = {};

    protected _mutators: AccessorMap<T["_attributes"]> = {};

    public getTableName(): string {
        return generateTableNames(this._table || this.constructor.name);
    }

    public getKeyName(): string {
        return this._primaryKey;
    }

    public getKey(): string | number {
        return this._attributes[this._primaryKey] as (string | number);
    }

    public usesTimestamps(): boolean {
        return this._timeStamps;
    }

    getAttribute<K extends keyof T["_attributes"]>(key: K): T["_attributes"][K] | null {
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

    public setAttribute(key: keyof T["_attributes"], value: Exclude<any, undefined>): void {
        if (keyExist(this._guarded, key)) {
            throw new Error(`Attribute "${String(key)}" is guarded and cannot be set.`);
        }
        if (keyExist(this._mutators, key) && isFunction(this._mutators[key])) {
            value = this._mutators[key](value);
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
        if (this._fillable.length > 0) {
            for (const key of this._fillable) {
                if (key in attributes) {
                    this.setAttribute(key, attributes[key]);
                }
            }
        } else {
            for (const [key, value] of Object.entries(attributes)) {
                if (!this._guarded.includes(key as string)) {
                    this.setAttribute(key as keyof T["_attributes"], value);
                } else {
                    throw new Error(`Attribute "${key}" is guarded and cannot be set.`);
                }
            }
        }
        return this;
    }


    public forceFill(attributes: Record<string, unknown>): this {
        for (const [key, value] of Object.entries(attributes)) {
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
        this.setAttribute(this._deletedAtColumn, date("Y-m-d H:i:s"));
        return this;
    }

    public restore(): this {
        if (!this._softDelete) {
            throw new Error("Soft delete is not enabled for this model.");
        }
        this.setAttribute(this._deletedAtColumn, null);
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

    public addAccessor(attribute: keyof T["_attributes"], fn: (value: T["_attributes"][keyof T["_attributes"]]) => unknown): void {
        if (!isFunction(fn)) {
            throw new Error("Accessor must be a function.");
        }
        this._accessors[attribute] = fn;
        if (!Object.prototype.hasOwnProperty.call(this, attribute)) {
            Object.defineProperty(this, attribute, {
                get: () => {
                    const raw = this._attributes[attribute] ?? null;
                    if (keyExist(this._accessors, attribute) && isFunction(this._accessors[attribute])) {
                        return this._accessors[attribute](raw);
                    } else {
                        return raw;
                    }
                },
                configurable: true,
                enumerable: true
            });
        }
    }

    public addMutator(attribute: keyof T["_attributes"], fn: (value: T["_attributes"][keyof T["_attributes"]]) => unknown): void {
        if (typeof fn !== 'function') {
            throw new Error("Mutator must be a function.");
        }
        this._mutators[attribute] = fn;
    }

    public static create(attributes: Record<string, unknown>): boolean {
        return true;
    };
}
export default BaseModel;