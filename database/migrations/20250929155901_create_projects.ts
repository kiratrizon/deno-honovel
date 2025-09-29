import { Migration } from "Illuminate/Database/Migrations/index.ts";
import { Schema } from "Illuminate/Support/Facades/index.ts";
import { Blueprint } from "Illuminate/Database/Schema/index.ts";

export default new (class extends Migration {
  public async up() {
    await Schema.create(
      "projects",
      (table: Blueprint) => {
        table.id();
        table.string("project_name").notNullable();
        table.text("description").notNullable();
        table.string("github_url").notNullable();
        table.string("live_demo_url").notNullable();
        table.timestamps();
      },
      this.connection
    );
  }

  public async down() {
    await Schema.dropIfExists("projects", this.connection);
  }
})();
