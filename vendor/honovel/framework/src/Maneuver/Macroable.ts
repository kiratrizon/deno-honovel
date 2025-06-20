export default class Macroable {
  constructor() {}
  private static macros: Record<string, Function> = {};

  public static macro<T>(
    name: string,
    fn: (this: T, ...args: unknown[]) => unknown
  ): void {
    this.macros[name] = fn;
  }

  public static applyMacrosTo(target: object): void {
    for (const [name, fn] of Object.entries(this.macros)) {
      // @ts-ignore: dynamic method assignment
      target[name] = fn.bind(target);
    }
  }
}
