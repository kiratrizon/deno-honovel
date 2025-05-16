// import DB from "../../main/database/Manager/DB.mjs";

interface IRegex {
  digit: string;
  alpha: string;
  alphanumeric: string;
  alphanumericspecial: string;
  slug: string;
  uuid: string;
}
class Validator {
  #validRules = [
    "required",
    "email",
    "min",
    "max",
    "unique",
    "confirmed",
    "regex",
  ];
  #regex = {
    digit: "\\d+",
    alpha: "[a-zA-Z]+",
    alphanumeric: "[a-zA-Z0-9]+",
    alphanumericspecial: "^[a-zA-Z0-9@#\\$%\\-_\\.!\\*]+$",
    slug: "[a-z0-9-]+",
    uuid: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
  };

  static async make(
    data: Record<string, unknown> = {},
    validations: Record<string, string> = {}
  ) {
    const v = new Validator(data, validations);
    await v.#validateAll();
    return v;
  }

  #data: Record<string, unknown> = {};
  #errors: Record<string, string[]> = {};
  #validations;
  constructor(
    data: Record<string, unknown>,
    validations: Record<string, string>
  ) {
    this.#data = data;
    this.#validations = validations;
  }

  getErrors() {
    return Object.fromEntries(
      Object.entries(this.#errors).filter(([_, v]) => (v as string[]).length)
    );
  }

  fails() {
    return Object.values(this.#errors).some((arr) => arr.length > 0);
  }

  async #validateAll() {
    for (const [key, ruleStr] of Object.entries(this.#validations)) {
      this.#errors[key] = [];
      for (const rule of ruleStr.split("|")) {
        const [name, val] = rule.split(":");
        if (!this.#validRules.includes(name))
          throw new Error(`Validation rule ${name} is not supported.`);
        await this.#applyRule(key, name, val);
      }
    }
  }

  async #applyRule(key: string, name: string, val: unknown) {
    const v = this.#data[key];
    const e = this.#errors[key];

    switch (name) {
      case "required":
        if (!isset(v) || empty(v)) e.push("This field is required.");
        break;
      case "email":
        if (!(v as string)?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
          e.push("Invalid email format.");
        break;
      case "min":
        if (typeof v !== "string" || v.length < parseInt(val as string))
          e.push(`Minimum length is ${val}.`);
        break;
      case "max":
        if (typeof v !== "string" || v.length > parseInt(val as string))
          e.push(`Maximum length is ${val}.`);
        break;
      case "unique": {
        const [table, column] = (val as string).split(",");
        // const exists = await DB.table(table).where(column, v).first();
        const exists = false; // Simulating a database check
        if (exists) e.push(`The ${key} must be unique.`);
        break;
      }
      case "confirmed":
        if (v !== this.#data[`${key}_confirmation`])
          e.push("Confirmation does not match.");
        break;
      case "regex": {
        const pattern = this.#regex[val as keyof IRegex];
        if (!pattern) e.push(`Regex ${val} is not defined.`);
        else if (!(v as string)?.match(new RegExp(pattern)))
          e.push(`Invalid format for ${key}.`);
        break;
      }
    }
  }
}

export default Validator;
