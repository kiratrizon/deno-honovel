import { Model } from "Illuminate/Database/Eloquent/index.ts";
import Collection from "Illuminate/Database/Eloquent/Collection.ts";

export default class BindingRegistry {
  private static bindings: {
    action: string;
    class: any;
  }[] = [
    {
      action: "toObject",
      class: Model,
    },
    {
      action: "toArray",
      class: Collection,
    },
  ];

  public static bind(action: string, selectedClass: any) {
    this.bindings.push({ action, class: selectedClass });
  }

  private static getBinding(data: object) {
    return this.bindings.find((binding) => {
      if (data instanceof binding.class && methodExist(data, binding.action)) {
        return binding;
      }
    });
  }

  public static bindData(
    data: unknown,
    seen: WeakSet<object> = new WeakSet(),
  ): any {
    // Handle primitives early
    if (!isObject(data) && !isArray(data)) {
      return data;
    }

    // 🚫 Prevent infinite recursion (circular reference protection)
    if (isObject(data) || isArray(data)) {
      if (seen.has(data as object)) {
        return "[Circular]";
      }
      seen.add(data as object);
    }

    const detectedBinding = this.getBinding(data as object);
    if (detectedBinding) {
      const result = (data as any)[detectedBinding.action]();
      return this.bindData(result, seen);
    }

    if (isArray(data)) {
      return data.map((item) => {
        return this.bindData(item, seen);
      });
    } else if (isObject(data)) {
      const newData: Record<string, unknown> = {};
      for (const key in data as any) {
        newData[key] = this.bindData((data as any)[key], seen);
      }
      return newData;
    } else {
      return data;
    }
  }
}
