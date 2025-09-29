import { Model } from "Illuminate/Database/Eloquent/index.ts";

export type ProjectSchema = {
  id?: number;
  project_name: string;
  description: string;
  github_url: string;
  live_demo_url: string;
};

class Project extends Model<ProjectSchema> {
  protected static override _fillable = [
    "project_name",
    "description",
    "github_url",
    "live_demo_url",
  ];
}

export default Project;
