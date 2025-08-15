import { Factory } from "Illuminate/Database/Eloquent/Factories/index.ts";
import Reply from "App/Models/Reply.ts";

export default class ReplyFactory extends Factory {
  protected override _model = Reply;

  public definition() {
    return {
      comments_id: this.faker.numberBetween(1, 100), // Assuming comment IDs are between 1 and 50
      users_id: this.faker.numberBetween(1, 10), // Assuming user IDs are between 1 and 10
      content: this.faker.sentence(), // Generate a random sentence for the reply content
    };
  }
}
