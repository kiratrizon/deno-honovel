export default class TrimStrings {
  private trimValue(value: unknown): unknown {
    if (typeof value === "string") {
      return value.trim();
    }
    if (isArray(value)) {
      return value.map((v) => this.trimValue(v));
    }
    if (value && typeof value === "object") {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        obj[k] = this.trimValue(v);
      }
      return obj;
    }
    return value;
  }

  public handle: HttpMiddleware = async ({ request }, next) => {
    const trimmedData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(request.all())) {
      trimmedData[key] = this.trimValue(value);
    }
    request.merge(trimmedData);
    return next();
  };
}
