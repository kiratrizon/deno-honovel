class Parent {
  protected fillable: string[] = [];
  constructor(attr?: Partial<Record<string, unknown>>) {
    if (attr) {
      this.fill(attr);
    }
  }

  public fill(data: Record<string, unknown>): this {
    console.log("fillable:", this.fillable);
    for (const key of this.fillable) {
      if (key in data) {
        // @ts-ignore - Assuming the type is correct
        this[key] = data[key];
      }
    }
    return this;
  }
}

class Child extends Parent {
  protected override fillable = ["name", "age"];
}

const childData = { name: "John", age: 30, extra: "not needed" };

const childInstance = new Child(childData);
