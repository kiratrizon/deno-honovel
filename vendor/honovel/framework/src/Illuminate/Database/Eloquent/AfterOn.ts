import { ModelAttributes } from "../../../../../@types/declaration/Base/IBaseModel.d.ts";
import Model from "./Model.ts";
import Builder from "./Builder.ts";
import WithBuilder from "./WithBuilder.ts";

export default class AfterOn {
  constructor(
    private model: typeof Model<ModelAttributes>,
    private connection: string,
  ) {}

  public async create<Attr extends Record<string, unknown>>(attributes?: Attr) {
    // @ts-ignore //
    const instance = new this.model(attributes) as Model<ModelAttributes>;
    await instance.save();
    return instance;
  }

  public where(column: string, value: unknown) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).where(column, value);
  }

  public whereIn(column: string, values: unknown[]) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).whereIn(column, values);
  }

  public whereNotIn(column: string, values: unknown[]) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).whereNotIn(column, values);
  }

  public whereNull(column: string) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).whereNull(column);
  }

  public whereNotNull(column: string) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).whereNotNull(column);
  }

  public whereBetween(column: string, values: [unknown, unknown]) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).whereBetween(column, values);
  }

  public whereNotBetween(column: string, values: [unknown, unknown]) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).whereNotBetween(column, values);
  }

  public join(table: string, column1: string, column2: string) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).join(table, column1, column2);
  }

  public leftJoin(table: string, column1: string, column2: string) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).leftJoin(table, column1, column2);
  }

  public rightJoin(table: string, column1: string, column2: string) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).rightJoin(table, column1, column2);
  }

  public crossJoin(table: string) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).crossJoin(table);
  }

  public fullJoin(table: string, column1: string, column2: string) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).fullJoin(table, column1, column2);
  }

  public groupBy(...columns: string[]) {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).groupBy(...columns);
  }

  public orderBy(column: string, direction: "asc" | "desc" = "asc") {
    return new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).orderBy(column, direction);
  }

  public async all<T extends typeof Model = typeof Model>(): Promise<
    InstanceType<T>[]
  > {
    return await new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).get<T>();
  }

  public async first(): Promise<InstanceType<
    typeof Model<ModelAttributes>
  > | null> {
    return await new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    ).first();
  }

  public async find<M extends Model<ModelAttributes> = Model<ModelAttributes>>(
    id: string | number,
  ): Promise<M | null> {
    return (await new Builder(
      {
        model: this.model,
        fields: ["*"],
      },
      this.connection,
    )
      .where(
        // @ts-ignore //
        new this.model().getKeyName(),
        id,
      )
      .first()) as unknown as M;
  }

  public async findOrFail<
    M extends Model<ModelAttributes> = Model<ModelAttributes>,
  >(id: string | number): Promise<M> {
    try {
      const record = await this.find<M>(id);
      if (!record) {
        throw new Error("Record not found");
      }
      return record;
    } catch (error) {
      // @ts-ignore //
      throw new Error(`Failed to find record: ${error.message}`);
    }
  }

  public with(...modelActions: string[]) {
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
        model: this.model,
        on: this.connection,
      },
      arrActionsAndFields,
    );
  }
}
