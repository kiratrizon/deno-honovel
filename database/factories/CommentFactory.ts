import { Factory } from "Illuminate/Database/Eloquent/Factories/index.ts";
import Comment from "App/Models/Comment.ts";

export default class CommentFactory extends Factory {
  protected override _model = Comment;

  public definition() {
    return {
      content: this.faker.sentence(),
      posts_id: this.faker.numberBetween(1, 50), // Assuming post IDs are between 1 and 100
      users_id: this.faker.numberBetween(1, 10), // Assuming user IDs are between 1 and 100
    };
  }
}
