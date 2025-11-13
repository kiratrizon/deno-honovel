import { Factory } from "Illuminate/Database/Eloquent/Factories/index.ts";
import Content from "App/Models/Content.ts";

export default class ContentFactory extends Factory {

  protected override _model = Content;

  public definition() {
    return {
      email: this.faker.email(),
      password: this.faker.password(12),
      name: this.faker.name()
    };
  }
}
