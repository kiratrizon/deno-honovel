import { Factory } from "Illuminate/Database/Eloquent/Factories/index.ts";
import Project from "App/Models/Project.ts";

export default class ProjectFactory extends Factory {

  protected override _model = Project;

  public definition() {
    return {
      email: this.faker.email(),
      password: this.faker.password(12),
      name: this.faker.name()
    };
  }
}
