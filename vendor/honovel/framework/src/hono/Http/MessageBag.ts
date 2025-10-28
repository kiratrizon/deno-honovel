export type ErrorsShape = Record<string, string[]>;

export default class MessageBag {
  private errors: ErrorsShape;

  constructor(errors: ErrorsShape = {}) {
    this.errors = errors;
  }

  public any(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  public all(): ErrorsShape {
    return this.errors;
  }

  public first(key: string): string | undefined {
    return this.errors[key]?.[0];
  }

  public get(key: string): string[] | undefined {
    return this.errors[key];
  }

  public has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.errors, key);
  }
}
