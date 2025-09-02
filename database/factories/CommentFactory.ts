import { Factory } from "Illuminate/Database/Eloquent/Factories/index.ts";
import Comment from "App/Models/Comment.ts";

export default class CommentFactory extends Factory {
  protected override _model = Comment;

  public definition() {
    return {
      content: this.faker.sentence(),
      posts_id: this.faker.numberBetween(1, 50),
      users_id: this.faker.numberBetween(1, 10),
    };
  }
}
