import { Migration } from "Illuminate/Database/Migrations/index.ts";
import { Schema } from "Illuminate/Support/Facades/index.ts";
import { Blueprint } from "Illuminate/Database/Schema/index.ts";

export default new (class extends Migration {
  public async up() {
    await Schema.create(
      "comments",
      (table: Blueprint) => {
        table.id();
        table.string("content").notNullable();
        table.integer("posts_id").foreign("posts").notNullable();
        table.integer("users_id").foreign("users").notNullable();
        table.timestamps();
      },
      this.connection
    );
  }

  public async down() {
    await Schema.dropIfExists("comments", this.connection);
  }
})();
