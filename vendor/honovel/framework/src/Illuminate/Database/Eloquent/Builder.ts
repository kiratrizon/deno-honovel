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
  public override async first(): Promise<InstanceType<T> | null> {
    const data = await super.first();
    if (!data) return null;
    // @ts-ignore //
    const modelInstance = new this.model();
    modelInstance.forceFill(data as B);
    return modelInstance;
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
