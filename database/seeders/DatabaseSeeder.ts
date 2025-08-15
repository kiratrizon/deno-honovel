import Seeder from "Illuminate/Database/Seeder.ts";
import User from "App/Models/User.ts";
import Post from "App/Models/Post.ts";
import Comment from "App/Models/Comment.ts";
import Reply from "App/Models/Reply.ts";

export default class DatabaseSeeder extends Seeder {
  public async run() {
    // Call your factories here
    const UserFactory = await User.factory(this.connection);
    const createUsers = await UserFactory.createMany(10);

    const PostFactory = await Post.factory(this.connection);
    const createPosts = await PostFactory.createMany(50);

    const CommentFactory = await Comment.factory(this.connection);
    const createComments = await CommentFactory.createMany(100);

    const ReplyFactory = await Reply.factory(this.connection);
    const createReplies = await ReplyFactory.createMany(200);
  }
}
