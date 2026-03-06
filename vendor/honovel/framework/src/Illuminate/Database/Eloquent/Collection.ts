import { Model } from "./index.ts";

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
}

export default Collection;
