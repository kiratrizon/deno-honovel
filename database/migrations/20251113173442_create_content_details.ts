import { Migration } from "Illuminate/Database/Migrations/index.ts";
import { Schema } from "Illuminate/Support/Facades/index.ts";
import { Blueprint } from "Illuminate/Database/Schema/index.ts";

export default new (class extends Migration {
  public async up() {
    await Schema.create("content_details", (table: Blueprint) => {
      table.id();
      table.string("sub_url").notNullable();
      table.string("sub_title").notNullable();
      table.integer("content_id").notNullable();
      table.timestamps();
    });
  }

  public async down() {
    await Schema.dropIfExists("content_details");
  }
})();
