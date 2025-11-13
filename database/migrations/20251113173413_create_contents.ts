import { Migration } from "Illuminate/Database/Migrations/index.ts";
import { Schema } from "Illuminate/Support/Facades/index.ts";
import { Blueprint } from "Illuminate/Database/Schema/index.ts";

export default new (class extends Migration {
  public async up() {
    await Schema.create(
      "contents",
      (table: Blueprint) => {
        table.id();
        table.string("url").notNullable();
        table.string("title").notNullable();
        table.string("description").notNullable();
        table.integer("sort").notNullable();
        table.timestamps();
      },
      this.connection
    );
  }

  public async down() {
    await Schema.dropIfExists("contents", this.connection);
  }
})();
