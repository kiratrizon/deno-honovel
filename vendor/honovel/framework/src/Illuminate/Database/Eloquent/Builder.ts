import { ModelAttributes } from "../../../../../@types/declaration/Base/IBaseModel.d.ts";
import Model from "./Model.ts";
import { Builder as RawBuilder, sqlstring } from "../Query/index.ts";
import Collection from "./Collection.ts";
import WithBuilder from "./WithBuilder.ts";

type THas = "hasMany" | "hasOne";

export default class Builder<
  B extends ModelAttributes = ModelAttributes,
  T extends typeof Model<B> = typeof Model<B>,
> extends RawBuilder {
  protected model: T;
  public _has?: THas;
  constructor(
    {
      model,
      fields = ["*"],
      has,
    }: { model: T; fields?: sqlstring[]; has?: THas },
    db?: string,
  ) {
    // @ts-ignore //
    const instanceModel = new model();
    const table = instanceModel.getTableName();
    const dbUsed = db || instanceModel.getConnection();
    super({ table, fields }, dbUsed);
    this.model = model;
    this._has = has;
  }

  // @ts-ignore //
  public override async first<M extends typeof Model = typeof Model>(): Promise<InstanceType<M> | null> {
    const data = await super.first();
    if (!data) return null;
    // @ts-ignore //
    const modelInstance = new this.model();
    modelInstance.forceFill(data as B);
    return modelInstance as InstanceType<M>;
  }

  // @ts-ignore //
  public override async get<M extends typeof Model = typeof Model>(): Promise<
    Collection<InstanceType<M>>
  > {
    const data = await super.get();
    const mapped = data.map((item) => {
      // @ts-ignore //
      const modelInstance = new this.model();
      modelInstance.forceFill(item as B);
      return modelInstance as InstanceType<M>;
    });
    if (isArray(mapped)) {
      // @ts-ignore //
      return new Collection<InstanceType<M>>(mapped);
    }
    throw new Error("Expected an array of results.");
  }

  /**
   * Update the first row this query matches, or create it when nothing does.
   *
   * `attributes` are added to the query as constraints and are also part of
   * the inserted row; `values` are applied on top in both branches. Any
   * where()/orWhere() already chained onto the builder still applies, so a
   * match on "either of two columns" is expressible - something Laravel's
   * updateOrCreate can't do, since its attributes are always ANDed.
   *
   * Soft-delete aware, and that's the point of having it here rather than
   * reaching for DB.insertOrUpdate(): a trashed match is restored instead of
   * being updated while still hidden from every other query. Chain
   * withTrashed() so the lookup can see trashed rows in the first place.
   *
   * Note fill() throws on attributes outside the model's _fillable, so a typo
   * in `values` surfaces immediately rather than silently not being written.
   */
  public async updateOrCreate<M extends typeof Model = typeof Model>(
    // Deliberately Partial<ModelAttributes> and not Partial<B>: putting the
    // class's own type parameter in a parameter position makes Builder
    // invariant in B, and Builder<ModelAttributes> then stops being assignable
    // to Builder<SomeSchema> - which breaks every hasOne()/hasMany() return
    // type across the models.
    attributes: Partial<ModelAttributes> = {},
    values: Partial<ModelAttributes> = {},
  ): Promise<InstanceType<M>> {
    for (const [column, value] of Object.entries(attributes)) {
      // @ts-ignore //
      this.where(column, value);
    }

    const existing = await this.first<M>();

    if (existing) {
      const softDeletes =
        (this.model as unknown as { _softDelete?: boolean })._softDelete ===
          true;

      if (softDeletes && existing.isTrashed()) {
        existing.restore();
      }

      existing.fill({ ...values } as Partial<ModelAttributes>);
      await existing.save();
      return existing;
    }

    // @ts-ignore //
    const created = await this.model.create({ ...attributes, ...values });
    return created as InstanceType<M>;
  }

  /**
   * Eager load relationships for the model.
   * @param modelActions The relationships to load.
   */
  with(...modelActions: string[]) {
    const arrActionsAndFields: Array<{
      actions: string[];
      fields: string[][];
    }> = [];
    modelActions.forEach((modelAction) => {
      const separateActions = modelAction.split("."); // ["posts", "comments"]
      const actionFields = separateActions.map((action) => {
        const [a, fields = "*"] = action.split(":");
        return { action: a, fields };
      });
      const actions = actionFields.map((item) => item.action);
      const fields = actionFields.map((item) => item.fields.split(","));
      arrActionsAndFields.push({ actions, fields });
    });

    return new WithBuilder(
      {
        model: this.model as unknown as typeof Model<ModelAttributes>,
        on: this.dbUsed,
      },
      arrActionsAndFields,
      this,
    );
  }
}
