import Seeder from "Illuminate/Database/Seeder.ts";
import User from "App/Models/User.ts";
import Project from "App/Models/Project.ts";
import { ContentSchema } from "App/Models/Content.ts";

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

    const contents: ContentSchema[] = [
      {
        title: "Introduction",
        description:
          "Welcome to Honovel Deno, a lightweight framework inspired by Laravel, built with Deno and Hono.",
        url: "/introduction",
        sort: 1,
      },
      {
        title: "Getting Started",
        description:
          "Learn how to install, configure, and run your first Honovel Deno app.",
        url: "/getting-started",
        sort: 2,
      },
      {
        title: "Routing",
        description:
          "Understand how routing works — define routes, controllers, and middleware.",
        url: "/routing",
        sort: 3,
      },
      {
        title: "Controllers",
        description:
          "Learn how to organize logic into controllers similar to Laravel.",
        url: "/controllers",
        sort: 4,
      },
      {
        title: "Views",
        description: "Render templates with support for Blade-like syntax.",
        url: "/views",
        sort: 5,
      },
      {
        title: "Models",
        description:
          "Manage your data layer with database connections and ORM-like helpers.",
        url: "/models",
        sort: 6,
      },
      {
        title: "Configuration",
        description: "Customize environment settings and app behavior.",
        url: "/configuration",
        sort: 7,
      },
      {
        title: "Commands",
        description: "Extend the CLI with custom artisan-like commands.",
        url: "/commands",
        sort: 8,
      },
      {
        title: "Deployment",
        description:
          "Best practices for deploying your Honovel Deno application.",
        url: "/deployment",
        sort: 9,
      },
      {
        title: "API Reference",
        description:
          "Comprehensive documentation for Honovel’s API methods and utilities.",
        url: "/api",
        sort: 10,
      },
    ];
  }
}
