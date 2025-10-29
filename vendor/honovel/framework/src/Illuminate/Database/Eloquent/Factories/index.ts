import { toFileUrl } from "jsr:@std/path@0.224.0";
import { FakerFactory } from "../../../../../../../Faker/index.ts";
import { DB } from "../../../Support/Facades/index.ts";
import { Model } from "../index.ts";

export abstract class Factory {
  protected faker = FakerFactory.create();
  protected _model?: typeof Model<any>;
  protected _count = 1;
  /**
   * Create a new factory instance for the given model.
   * @param model The model class to create instances of.
   */

  private _connection: string = DB.getDefaultConnection();

  protected setConnection(connection: string) {
    this._connection = connection;
  }

  protected setModel(model: typeof Model<any>) {
    if (!isset(this._model)) this._model = model;
  }

  /** Child factories must define fake data */
  public abstract definition(): Record<string, unknown>;

  /** Set how many models to make/create */
  public count(n: number): this {
    this._count = n;
    return this;
  }

  /** Generate attributes */
  public make(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = [];
    for (let i = 0; i < this._count; i++) {
      results.push({ ...this.definition(), ...overrides });
    }
    return results;
  }

  /** Generate a single attribute set */
  public makeOne(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return { ...this.definition(), ...overrides };
  }

  /** Create and save model instances */
  public async create(
    overrides: Record<string, unknown> = {},
  ): Promise<
    Model<Record<string, unknown>> | Model<Record<string, unknown>>[]
  > {
    const defs = this.make(overrides);
    const models: Model<Record<string, unknown>>[] = [];

    for (const def of defs) {
      // @ts-ignore - We assume the model is compatible with the factory //
      const instance = new this._model(def) as Model<Record<string, unknown>>;
      instance.setConnection(this._connection);
      await instance.save();
      models.push(instance);
    }

    return this._count === 1 ? models[0] : models;
  }

  /** Create a single model */
  public async createOne(
    overrides: Record<string, unknown> = {},
  ): Promise<Model<Record<string, unknown>>> {
    const currentCount = this._count;
    this._count = 1;
    const data = this.create(overrides) as Promise<
      Model<Record<string, unknown>>
    >;
    this._count = currentCount;
    return data;
  }

  /** Create multiple models */
  public async createMany(
    count: number,
    overrides: Record<string, unknown> = {},
  ): Promise<Model<Record<string, unknown>>[]> {
    const currentCount = this._count;
    this._count = count;
    const result = await this.create(overrides);
    this._count = currentCount;
    return Array.isArray(result) ? result : [result];
  }
}

export class HasFactory {
  public static async getFactoryByModel<
    T extends typeof Model<any> = typeof Model<any>,
  >(model: T): Promise<Factory> {
    const factoryPath =
      toFileUrl(databasePath(`factories/${model.name}Factory.ts`)).href;
    const factoryModule = await import(factoryPath);
    if (!isset(factoryModule.default)) {
      throw new Error(
        `Factory for model ${model.name} not found at ${factoryPath}`,
      );
    }
    // @ts-ignore - We assume the factory is compatible with the model //
    const factory = new factoryModule.default() as Factory;
    // @ts-ignore - protected property access //
    factory.setModel(model);
    return factory;
  }
}
