import Model from "Illuminate/Database/Eloquent/Model.ts";

class Collection<T extends Model> extends Array<T> {
  constructor(items: T[] = []) {
    if (!isArray(items))
      throw new TypeError("Collection constructor expects an array");
    super(...items);
    // Fix prototype chain for older environments (optional but safe)
    // Object.setPrototypeOf(this, Collection.prototype);
  }

  /**
   * Get the first item in the collection or null if empty.
   * @returns Model instance or null
   */
  first(): T | null {
    return this.length > 0 ? this[0] : null;
  }

  /**
   * Get an array of values for a given key from all items in the collection.
   * @param key The key to pluck values for.
   * @returns An array of values for the specified key.
   */
  pluck<K extends keyof T>(key: K): Array<T[K]> {
    return this.map((item) => item[key]);
  }

  /**
   * Convert the collection to an array of plain objects.
   * @returns An array of plain objects representing the collection items.
   */
  toArray(): (T | Record<string, unknown>)[] {
    const data: (T | Record<string, unknown>)[] = [];
    for (const item of this) {
      const attributes = item.toObject();
      data.push(attributes);
    }
    return data;
  }

  public override map<U>(
    callbackfn: (value: T, index: number, array: T[]) => U,
  ): U[] {
    const data: U[] = [];
    this.forEach((item, index, array) => {
      data.push(callbackfn(item, index, array));
    });
    return data;
  }

  public override slice(start?: number, end?: number): T[] {
    const length = this.length;
    let begin = start ?? 0;
    let stop = end ?? length;

    if (begin < 0) begin = Math.max(length + begin, 0);
    else begin = Math.min(begin, length);

    if (stop < 0) stop = Math.max(length + stop, 0);
    else stop = Math.min(stop, length);

    const data: T[] = [];
    for (let i = begin; i < stop; i++) {
      data.push(this[i]);
    }
    return data;
  }
}

export default Collection;
