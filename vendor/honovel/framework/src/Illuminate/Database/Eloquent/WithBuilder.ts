import { ModelAttributes } from "../../../../../@types/declaration/Base/IBaseModel.d.ts";
import Model from "./Model.ts";
import Builder from "./Builder.ts";

export default class WithBuilder {
  connection: string;
  private model: typeof Model<ModelAttributes>;
  constructor(
    {
      model,
      on,
    }: {
      model: typeof Model<ModelAttributes>;
      on?: string;
    },
    private actionsAndFields: { actions: string[]; fields: string[][] }[],
    private builderInstance?: Builder,
  ) {
    this.model = model;
    // @ts-ignore //
    const newModel = new model() as Model<ModelAttributes>;
    this.connection = on || newModel.getConnection();
  }

  async get() {
    const allThisData = !this.builderInstance
      ? await this.model.on(this.connection).all()
      : await this.builderInstance.get();
    if (!allThisData.length) return allThisData;

    const currentLevel = {
      data: [allThisData],
      model: this.model,
    };

    for (const { actions, fields } of this.actionsAndFields) {
      // @ts-ignore //
      await this.iterateWith(currentLevel, [...actions], [...fields]);
    }

    return allThisData;
  }

  async first() {
    const allThisData = !this.builderInstance
      ? await this.model.on(this.connection).first()
      : await this.builderInstance.first();
    if (!allThisData) return null;
    const currentLevel = {
      data: [[allThisData]],
      model: this.model,
    };
    for (const { actions, fields } of this.actionsAndFields) {
      await this.iterateWith(currentLevel, [...actions], [...fields]);
    }
    return allThisData;
  }

  private async iterateWith(
    currentLevel: {
      data: Model<ModelAttributes>[][];
      model: typeof Model<ModelAttributes>;
    },
    actions: string[],
    fields: string[][],
  ) {
    while (actions.length > 0 && currentLevel.data.length > 0) {
      const action = actions.shift();
      const fieldsForAction = fields.shift() || ["*"];
      if (!action) break;
      const nextLevel: {
        data: Model<ModelAttributes>[][];
        model: typeof Model<ModelAttributes>;
      } = {
        data: [],
        model: null as unknown as typeof Model<ModelAttributes>,
      };
      for (const items of currentLevel.data) {
        for (const instance of items) {
          if (methodExist(instance, action)) {
            const relatedData = (instance as any)[action]() as Builder;
            if (relatedData instanceof Builder) {
              const query = relatedData.select(...fieldsForAction);
              const relatedItems = await query.get();
              if (relatedItems.length > 0) {
                if (relatedData._has === "hasOne") {
                  instance.forceFill({
                    [action]: relatedItems.first(),
                  });
                } else {
                  instance.forceFill({
                    [action]: relatedItems,
                  });
                }
                nextLevel.data.push(relatedItems);
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
