import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { HasFactory } from "Illuminate/Database/Eloquent/Factories/index.ts";
import Comment from "./Comment.ts";

export type PostSchema = {
  id?: number;
  title: string;
  content: string;
  users_id: number; // Foreign key to User model
};

class Post extends Model<PostSchema> {
  protected static override _fillable = ["title", "content", "users_id"];

  protected static override use = {
    HasFactory,
  };

  public comments() {
    return this.hasMany(Comment);
  }
}

export default Post;
