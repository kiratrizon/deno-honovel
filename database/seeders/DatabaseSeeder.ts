import Seeder from "Illuminate/Database/Seeder.ts";
import User from "App/Models/User.ts";
import Project from "App/Models/Project.ts";

export default class DatabaseSeeder extends Seeder {
  public async run() {
    const projects = [
      {
        project_name: "Honovel",
        description:
          "A Laravel-like typescript-only web framework powered by Deno and Hono.",
        github_url: "https://github.com/kiratrizon/deno-honovel",
        live_demo_url: "https://honovel.deno.dev",
      },
    ];

    for (const project of projects) {
      await Project.create(project);
    }
  }
}
