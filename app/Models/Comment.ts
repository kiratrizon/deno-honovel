import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { HasFactory } from "Illuminate/Database/Eloquent/Factories/index.ts";
import Reply from "./Reply.ts";

export type CommentSchema = {
  id?: number;
  content: string;
  posts_id: number; // Foreign key to Post model
  users_id: number; // Foreign key to User model
};

class Comment extends Model<CommentSchema> {
  protected static override _fillable = ["content", "posts_id", "users_id"];

  protected static override use = {
    HasFactory,
  };

  public replies() {
    return this.hasMany(Reply);
  }
}

export default Comment;
