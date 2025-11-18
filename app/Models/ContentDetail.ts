import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { HasFactory } from "Illuminate/Database/Eloquent/Factories/index.ts";

export type ContentDetailSchema = {
  id?: number;
  content_id: number;
  sub_url: string;
  sub_title: string;
};

class ContentDetail extends Model<ContentDetailSchema> {
  protected static override _fillable = ["content_id", "sub_url", "sub_title"];

  protected static override use = {
    HasFactory,
  };
}

export default ContentDetail;
