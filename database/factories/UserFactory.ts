import { Factory } from "Illuminate/Database/Eloquent/Factories/index.ts";

export default class UserFactory extends Factory {
  public definition() {
    return {
      email: this.faker.email(),
      password: this.faker.password(12),
      name: this.faker.name(),
      api_token: this.faker.uuid(), // Generate a random API token
    };
  }
}
