import { Migration } from "Illuminate/Database/Migrations/index.ts";
import { Schema } from "Illuminate/Support/Facades/index.ts";
import { Blueprint } from "Illuminate/Database/Schema/index.ts";

export default new (class extends Migration {
  public async up() {
    await Schema.create(
      "replies",
      (table: Blueprint) => {
        table.id();
        table.string("content").notNullable();
        table.integer("comments_id").foreign("comments").notNullable(); // Foreign key to Comment model
        table.integer("users_id").foreign("users").notNullable(); // Foreign key to
        table.timestamps();
      },
      this.connection
    );
  }

  public async down() {
    await Schema.dropIfExists("replies", this.connection);
  }
})();
