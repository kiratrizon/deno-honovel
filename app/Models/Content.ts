import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { HasFactory } from "Illuminate/Database/Eloquent/Factories/index.ts";
import ContentDetail from "./ContentDetail.ts";

export type ContentSchema = {
  id?: number;
  view: string;
  title: string;
  description: string;
  sort: number;
  category: number;
};

class Content extends Model<ContentSchema> {
  protected static override _fillable = [
    "view",
    "title",
    "description",
    "sort",
    "category",
  ];

  protected static override use = {
    HasFactory,
  };

  public contentDetails() {
    return this.hasMany(ContentDetail, "content_id");
  }
}

export default Content;
