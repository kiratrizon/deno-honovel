import "../hono-globals/index.ts";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
import { Database, QueryResultDerived } from "Database";

const myCommand = new Command();

import { IMyArtisan } from "../@hono-types/IMyArtisan.d.ts";
class MyArtisan {
  private static db = new Database();
  constructor() {}
  private async createConfig(options: { force?: boolean }, name: string) {
    const stubPath = honovelPath("stubs/ConfigDefault.stub");
    const stubContent = getFileContents(stubPath);
    if (!options.force) {
      if (pathExist(basePath(`config/${name}.ts`))) {
        console.error(
          `❌ Config file ${basePath(`config/${name}.ts`)} already exist.`
        );
        Deno.exit(1);
      }
    }
    writeFile(basePath(`config/${name}.ts`), stubContent);
    console.log(
      `✅ ${options.force ? "Overwrote" : "File created at"} ${basePath(
        `config/${name}.ts`
      )}`
    );
    Deno.exit(0);
  }

  private async publishConfig() {
    // Read the module names from the JSON file
    const modules: string[] = Object.keys(myConfigData);
    let output = "";
    for (const name of modules) {
      output += `import ${name} from "../${name}.ts";\n`;
    }
    output += `\nexport default {\n`;
    for (const name of modules) {
      output += `  ${name},\n`;
    }
    output += `};\n`;
    writeFile(basePath("config/build/myConfig.ts"), output);
    console.log(`✅ Generated ${basePath("config/build/myConfig.ts")}`);
  }

  private async makeController(options: { resource?: boolean }, name: string) {
    let stubPath: string;
    if (options.resource) {
      stubPath = honovelPath("stubs/ControllerResource.stub");
    } else {
      stubPath = honovelPath("stubs/ControllerDefault.stub");
    }
    const stubContent = getFileContents(stubPath);
    const controllerContent = stubContent.replace(/{{ ClassName }}/g, name);

    writeFile(basePath(`app/Http/Controllers/${name}.ts`), controllerContent);
    console.log(`✅ Generated app/Controllers/${name}.ts`);
    Deno.exit(0);
  }

  private async getBatchNumber(): Promise<number> {
    const result = await MyArtisan.db.runQuery<"select">(
      `SELECT MAX(batch) AS max_batch FROM migrations`
    );
    const maxBatch = Number(result[0]?.max_batch ?? 0);
    return maxBatch + 1;
  }
  private async runMigrations(options: { seed?: boolean; path?: string }) {
    await this.createMigrationTable();
    const modules = await loadMigrationModules();
    const batchNumber = await this.getBatchNumber();

    const type = "up"; // or "down" based on your requirement
    for (const module of modules) {
      const { name, migration } = module;
      const isApplied = await MyArtisan.db.runQuery<"select">(
        `SELECT COUNT(*) AS count FROM migrations WHERE name = ?`,
        [name]
      );
      if ((isApplied[0] as { count: number }).count > 0) {
        console.log(`Migration ${name} already applied.`);
        continue;
      }
      await migration.run(type);
      await MyArtisan.db.runQuery<"insert">(
        `INSERT INTO migrations (name, batch) VALUES (?, ?)`,
        [name, batchNumber]
      );
      console.log(`Migration ${name} applied successfully.`);
    }
  }

  private async freshMigrations(options: { seed?: boolean; path?: string }) {
    await this.dropAllTables();
    await this.createMigrationTable();
    const modules = await loadMigrationModules();
    const batchNumber = await this.getBatchNumber();
    const type = "up"; // or "down" based on your requirement
    for (const module of modules) {
      const { name, migration } = module;
      const isApplied = await MyArtisan.db.runQuery<"select">(
        `SELECT COUNT(*) AS count FROM migrations WHERE name = ?`,
        [name]
      );
      if ((isApplied[0] as { count: number }).count > 0) {
        console.log(`Migration ${name} already applied.`);
        continue;
      }
      await migration.run(type);
      await DB.table("migrations").insert({
        name,
        batch: batchNumber,
      });
      console.log(`Migration ${name} applied successfully.`);
    }
  }

  private async refreshMigrations(options: {
    seed?: boolean;
    step?: number;
    path?: string;
  }) {
    await this.createMigrationTable();

    // Logic to rollback and re-run migrations
  }

  private async createMigrationTable() {
    const dbType = env("DB_CONNECTION", "mysql");
    let sql = "";

    switch (dbType) {
      case "mysql":
        sql = `
        CREATE TABLE IF NOT EXISTS \`migrations\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`name\` VARCHAR(255) NOT NULL,
          \`batch\` INT NOT NULL,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;
        break;

      case "pgsql":
        sql = `
        CREATE TABLE IF NOT EXISTS "migrations" (
          "id" SERIAL PRIMARY KEY,
          "name" VARCHAR(255) NOT NULL,
          "batch" INTEGER NOT NULL,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
        break;

      case "sqlite":
        sql = `
        CREATE TABLE IF NOT EXISTS "migrations" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "name" TEXT NOT NULL,
          "batch" INTEGER NOT NULL,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
        break;

      case "sqlsrv":
        sql = `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='migrations' and xtype='U')
        CREATE TABLE [migrations] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [name] NVARCHAR(255) NOT NULL,
          [batch] INT NOT NULL,
          [created_at] DATETIME DEFAULT GETDATE()
        );
      `;
        break;

      default:
        throw new Error(`Unsupported DB type: \`${dbType}\``);
    }
    await MyArtisan.db.runQuery(sql);
  }

  private async dropAllTables(): Promise<void> {
    const dbType = env("DB_CONNECTION", "mysql").toLowerCase();
    let tables: string[] = [];

    switch (dbType) {
      case "mysql": {
        const result = await MyArtisan.db.runQuery<"select">(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
          [staticConfig("database.connections.mysql.database")]
        );
        tables = result.map((row) => `\`${row.table_name}\``);
        break;
      }

      case "pgsql": {
        const result = await MyArtisan.db.runQuery<"select">(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
        );
        tables = result.map((row) => `"${row.tablename}"`);
        break;
      }

      case "sqlite": {
        const result = await MyArtisan.db.runQuery<"select">(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
        );
        tables = result.map((row) => `"${row.name}"`);
        break;
      }

      case "sqlsrv": {
        const result = await MyArtisan.db.runQuery<"select">(
          `SELECT name FROM sys.tables`
        );
        tables = result.map((row) => `[${row.name}]`);
        break;
      }

      default:
        throw new Error(`Unsupported DB type: \`${dbType}\``);
    }

    if (tables.length === 0) {
      console.log("⚠️ No tables found to drop.");
      return;
    }

    if (dbType === "sqlite") {
      for (const table of tables) {
        await MyArtisan.db.runQuery(`DROP TABLE ${table};`);
      }
    } else {
      const dropSQL = `DROP TABLE ${tables.join(", ")};`;
      await MyArtisan.db.runQuery(dropSQL);
    }
  }

  public async command(args: string[]): Promise<void> {
    await myCommand
      .name("Honovel")
      .description("Honovel CLI")
      .version(frameworkVersion().honovelVersion)
      .command("make:config", "Make a new config file")
      .arguments("<name:string>")
      .option("--force", "Force overwrite existing config file")
      .action((options, name) => this.createConfig.bind(this)(options, name))

      .command("make:controller", "Generate a controller file")
      .arguments("<name:string>")
      .option(
        "--resource",
        "Generate a resourceful controller (index, create, store, etc.)"
      )
      .action((options, name) => this.makeController.bind(this)(options, name))

      .command("migrate", "Run the database migrations")
      .option("--seed", "Seed the database after migration")
      .option("--path <path:string>", "Specify a custom migrations directory")
      .action((options) => this.runMigrations.bind(this)(options))

      .command("migrate:fresh", "Drop all tables and rerun all migrations")
      .option("--seed", "Seed the database after fresh migration")
      .option("--path <path:string>", "Specify a custom migrations directory")
      .action((options) => this.freshMigrations.bind(this)(options))

      .command("migrate:refresh", "Rollback and re-run all migrations")
      .option("--seed", "Seed the database after refresh")
      .option(
        "--step <step:number>",
        "Number of steps to rollback before migrating"
      )
      .option("--path <path:string>", "Specify a custom migrations directory")
      .action((options) => this.refreshMigrations.bind(this)(options))

      .command(
        "publish:config",
        "Build your configs in config/build/myConfig.ts"
      )
      .action(() => this.publishConfig.bind(this)())
      .parse(args);
  }
}

import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { Migration } from "Illuminate/Database/Migrations";
import { DB } from "Illuminate/Support/Facades";

interface ModuleMigration {
  name: string;
  migration: Migration;
}

export async function loadMigrationModules(): Promise<ModuleMigration[]> {
  const migrationsPath = databasePath("migrations");
  const modules: ModuleMigration[] = [];

  for await (const entry of Deno.readDir(migrationsPath)) {
    if (entry.isFile && entry.name.endsWith(".ts")) {
      const fullPath = join(migrationsPath, entry.name);
      const fileUrl = `file://${fullPath}`;
      const mod = await import(fileUrl);
      if (mod?.default) {
        modules.push({
          name: entry.name.replace(/\.ts$/, ""),
          migration: mod.default,
        });
      }
    }
  }

  return modules;
}

const Artisan: IMyArtisan = new MyArtisan();

export default Artisan;
