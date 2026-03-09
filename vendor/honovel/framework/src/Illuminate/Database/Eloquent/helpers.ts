import { Str } from "../../Support/index.ts";
import pluralize from "pluralize";

export function generateTableName(modelName: string): string {
  const snakeCase = Str.snake(modelName);
  return pluralize.plural(snakeCase);
}

export type ModelWithAttributes<
  T extends Record<string, unknown>,
  C extends new (attr: T) => unknown,
> = (new (...args: ConstructorParameters<C>) => InstanceType<C> & T) & C;

export function schemaKeys<T extends Record<string, unknown>>(
  keys: (keyof T)[],
) {
  return keys;
}
