import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { HasFactory } from "Illuminate/Database/Eloquent/Factories/index.ts";

export type ReplySchema = {
  id?: number;
  comments_id: number; // Foreign key to Comment model
  users_id: number; // Foreign key to User model
  content: string;
};

class Reply extends Model<ReplySchema> {
  protected static override _fillable = ["comments_id", "users_id", "content"];

  protected static override use = {
    HasFactory: HasFactory,
  };
}

export default Reply;
