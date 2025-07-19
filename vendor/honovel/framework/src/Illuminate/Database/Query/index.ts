import { DB, insertBuilder } from "Illuminate/Support/Facades/index.ts";
import { Database } from "Database";

type sqlstring = string | SQLRaw | Builder;

export class Builder {
  #table: string;
  #alias: string | null = null;
  #bindings: any[][] = [];
  #param: any[] = [];
  constructor(tableName: Exclude<sqlstring, Builder>, private fields: sqlstring[] = ["*"]) {
    const raw = this.extract(tableName).split(" ");
    if (raw.length < 4) {
      if (raw.length === 1) {
        this.#table = raw[0];
      } else {
        this.#table = raw[0];
        this.#alias = end(raw);
      }
    } else {
      this.#table = end(raw)!;
    }
  }

  private extract(arg: sqlstring): string {
    if (typeof arg === "string") {
      return arg;
    } else if (arg instanceof SQLRaw) {
      this.#param.push(undefined);
      return arg.toString();
    } else if (arg instanceof Builder) {
      this.#param.push(undefined);
      this.#bindings.push(arg.getBindings());
      return arg.toSql().toString();
    }
    throw new Error("Invalid argument type");
  }

  public mergeBindings(sub: Builder): this {
    this.#bindings.push(sub.getBindings());
    return this;
  }

  public getBindings(): any[] {
    const allValues = this.#param.flatMap((value) => {
      if (isUndefined(value)) {
        return this.#bindings.shift() || [];
      }
      return value;
    });
    return allValues;
  }

  public toSql(): SQLRaw {
    return new SQLRaw("");
  }

  private validateData(data: any) {
    if (isUndefined(data)) {
      return null;
    }
    if (isObject(data)) {
      return jsonEncode(data);
    }
    return data;
  }

  public async insert(...data: Record<string, unknown>[]) {
    const [sql, values] = insertBuilder({
      "table": this.#table,
      data
    });
    const db = new Database();
    const result = await db.runQuery<"insert">(sql, [...this.getBindings(), ...values]);
    return result;
  }
}

export class SQLRaw extends String {

}
