import { Migration } from "Illuminate/Database/Migrations/index.ts";
import { Schema } from "Illuminate/Support/Facades/index.ts";
import { Blueprint } from "Illuminate/Database/Schema/index.ts";

export default new (class extends Migration {
  public async up() {
    await Schema.create(
      "posts",
      (table: Blueprint) => {
        table.id();
        table.string("title").notNullable();
        table.string("content").notNullable();
        table.integer("users_id").foreign("users").notNullable(); // Foreign key to User model
        table.timestamps();
      },
      this.connection
    );
  }

  public async down() {
    await Schema.dropIfExists("posts", this.connection);
  }
})();
