import Seeder from "Illuminate/Database/Seeder.ts";
import User from "App/Models/User.ts";
import Project from "App/Models/Project.ts";
import Content, { ContentSchema } from "App/Models/Content.ts";

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

    // category 1 is Getting Started
    // category 2 is for Advanced Topics
    const contents: ContentSchema[] = [
      {
        title: "Introduction",
        description:
          "Welcome to Honovel Deno, a lightweight framework inspired by Laravel, built with Deno and Hono.",
        view: "introduction",
        sort: 1,
        category: 1,
      },
      {
        title: "Routing",
        description:
          "Understand how routing works — define routes, controllers, and middleware.",
        view: "routing",
        sort: 3,
        category: 1,
      },
      {
        title: "Controllers",
        description:
          "Learn how to organize logic into controllers similar to Laravel.",
        view: "controllers",
        sort: 4,
        category: 1,
      },
      {
        title: "Views",
        description: "Render templates with support for Blade-like syntax.",
        view: "views",
        sort: 5,
        category: 1,
      },
      {
        title: "Models",
        description:
          "Manage your data layer with database connections and ORM-like helpers.",
        view: "models",
        sort: 6,
        category: 1,
      },
      {
        title: "Commands",
        description: "Extend the CLI with custom artisan-like commands.",
        view: "commands",
        sort: 8,
        category: 1,
      },
      {
        title: "Deployment",
        description:
          "Best practices for deploying your Honovel Deno application.",
        view: "deployment",
        sort: 9,
        category: 2,
      },
    ];

    for (const content of contents) {
      await Content.create(content);
    }
  }
}
