import { Migration } from "Illuminate/Database/Migrations";
import { Schema } from "Illuminate/Support/Facades";
import { Blueprint } from "Illuminate/Database/Schema";

export default new (class extends Migration {
  public async up() {
    await Schema.create("users", (table: Blueprint) => {
      table.id();
      table.string("name").nullable();
      table.string("email").unique().nullable();
      table.string("password").nullable();
      table.timestamps();
    });
  }

  public async down() {
    await Schema.dropIfExists("users");
  }
})();
