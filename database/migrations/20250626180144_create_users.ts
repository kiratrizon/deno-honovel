import { Migration } from "Illuminate/Database/Migrations/index.ts";
import { Schema } from "Illuminate/Support/Facades/index.ts";
import { Blueprint } from "Illuminate/Database/Schema/index.ts";

export default new (class extends Migration {
  public async up() {
    await Schema.create(
      "users",
      (table: Blueprint) => {
        table.id();
        table.string("name").nullable();
        table.string("email").unique().nullable();
        table.string("password").nullable();
        table.string("api_token").unique().notNullable().unique();
        table.timestamps();
      },
      this.connection
    );
  }

  public async down() {
    await Schema.dropIfExists("users", this.connection);
  }
})();
