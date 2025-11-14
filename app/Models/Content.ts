import { Model } from "Illuminate/Database/Eloquent/index.ts";
import { HasFactory } from "Illuminate/Database/Eloquent/Factories/index.ts";

export type ContentSchema = {
  id?: number;
  url: string;
  title: string;
  description: string;
  sort: number;
  category: number;
};

class Content extends Model<ContentSchema> {
  protected static override _fillable = [
    "url",
    "title",
    "description",
    "sort",
    "category",
  ];

  protected static override use = {
    HasFactory,
  };
}

export default Content;
