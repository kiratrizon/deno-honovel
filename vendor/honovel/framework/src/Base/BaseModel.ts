import { IBaseModel, AccessorMap, PHPTimestampFormat, IStaticBaseModel, IBaseModelProperties, ModelWithAttributes } from "../@hono-types/declaration/Base/IBaseModel.d.ts";
import { staticImplements } from "../framework-utils/index.ts";


@staticImplements<IStaticBaseModel>()
class BaseModel<
    T extends IBaseModelProperties = {
        _attributes: Record<string, unknown>;
    },
    FillKeys extends (keyof T["_attributes"] | string) = keyof T["_attributes"]
> {
    constructor(attributes?: T["_attributes"]) {
        if (attributes) {
            this.fill(attributes);
        }
    }
    protected _timeStamps: boolean = true;
    protected _table?: string;
    protected _primaryKey: string = 'id';
    protected _incrementing: boolean = true;
    protected _keyType: "int" | "string" | "uuid" = "int";
    protected _guarded: FillKeys[] = [];
    protected _fillable: FillKeys[] = [];
    protected _hidden: FillKeys[] = [];
    protected _visible: FillKeys[] = [];
    protected _dateFormat: string = "Y-m-d H:i:s";
    protected _attributes: T["_attributes"] = {};
    protected _casts: Record<
        string,
        "string" | "int" | "boolean" | "array" | "object"
    > = {};
    protected _timestampsFields: [string, string] = ["created_at", "updated_at"];
    protected _softDelete: boolean = false;
    protected _deletedAtColumn: string = "deleted_at";
    protected _accessors: AccessorMap = {};
    protected _mutators: Record<string, (value: unknown) => unknown> = {};

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

    public getAttribute(key: string): unknown {
        const mutator = this._mutators?.[key];
        let value: unknown;
        if (isset(mutator) && isFunction(mutator)) {
            value = mutator(this._attributes[key] ?? null);
        } else {
            value = this._attributes[key] ?? null;
        }
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
        return value;
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
        this._attributes[key] = value ?? null;

        if (!keyExist(this, key)) {
            Object.defineProperty(this, key, {
                get: () => this.getAttribute(key as string),
                configurable: true,
                enumerable: true
            });
        }
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
                if (!this._guarded.includes(key as FillKeys)) {
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

    public toJSON(): Record<string, unknown> {
        const data = { ...this._attributes };

        if (this._visible.length) {
            const visibleData: Record<FillKeys, unknown> = {} as Record<FillKeys, unknown>;
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

    public toObject(): Record<string, unknown> {
        return this.toJSON();
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

    public addAccessor(attribute: string, fn: (value: unknown) => unknown): void {
        if (typeof fn !== 'function') {
            throw new Error("Accessor must be a function.");
        }
        this._accessors[attribute] = fn;
        if (!Object.prototype.hasOwnProperty.call(this, attribute)) {
            Object.defineProperty(this, attribute, {
                get: () => {
                    const raw = this._attributes[attribute] ?? null;
                    return this._accessors[attribute](raw);
                },
                configurable: true,
                enumerable: true
            });
        }
    }

    public addMutator(attribute: string, fn: (value: unknown) => unknown): void {
        if (typeof fn !== 'function') {
            throw new Error("Mutator must be a function.");
        }
        this._mutators[attribute] = fn;
    }

    public static create(attributes: Record<string, unknown>): boolean {
        return true;
    };
}
export default BaseModel as unknown as typeof IBaseModel;