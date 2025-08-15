import { Factory } from "Illuminate/Database/Eloquent/Factories/index.ts";
import Post from "App/Models/Post.ts";

export default class PostFactory extends Factory {
  protected override _model = Post;

  public definition() {
    return {
      title: this.faker.sentence(),
      content: this.faker.paragraph(),
      users_id: this.faker.numberBetween(1, 10), // Assuming user IDs are between 1 and 10
    };
  }
}
