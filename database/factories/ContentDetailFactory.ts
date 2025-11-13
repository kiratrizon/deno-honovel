import { Factory } from "Illuminate/Database/Eloquent/Factories/index.ts";
import ContentDetail from "App/Models/ContentDetail.ts";

export default class ContentDetailFactory extends Factory {

  protected override _model = ContentDetail;

  public definition() {
    return {
      email: this.faker.email(),
      password: this.faker.password(12),
      name: this.faker.name()
    };
  }
}
