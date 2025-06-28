import "../hono-globals/index.ts";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";
import { Database, dbCloser, QueryResultDerived } from "Database";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { Migration } from "Illuminate/Database/Migrations";
import { DB } from "Illuminate/Support/Facades";

const myCommand = new Command();

import { IMyArtisan } from "../../../@types/IMyArtisan.d.ts";
import path from "node:path";
class MyArtisan {
  private static db = new Database();
  constructor() { }
  private async createConfig(options: { force?: boolean }, name: string) {
    const stubPath = honovelPath("stubs/ConfigDefault.stub");
    const stubContent = getFileContents(stubPath);
    if (!options.force) {
      if (pathExist(basePath(`config/${name}.ts`))) {
        console.error(
          `❌ Config file ${basePath(`config/${name}.ts`)} already exist.`
        );
        return;
      }
    }
    writeFile(basePath(`config/${name}.ts`), stubContent);
    console.log(
      `✅ ${options.force ? "Overwrote" : "File created at"} ${basePath(
        `config/${name}.ts`
      )}`
    );
    return;
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
    console.log(
      `✅ Controller file created at ${path.relative(
        Deno.cwd(),
        basePath(`app/Http/Controllers/${name}.ts`)
      )}`
    );
    return;
  }

  private async getBatchNumber(): Promise<number> {
    const result = await MyArtisan.db.runQuery<"select">(
      `SELECT MAX(batch) AS max_batch FROM migrations`
    );
    const maxBatch = Number(result[0]?.max_batch ?? 0);
    return maxBatch + 1;
  }

  private async makeModel(
    options: {
      migration?: boolean;
      factory?: boolean;
      controller?: boolean;
      resource?: boolean;
      all?: boolean;
      pivot?: boolean;
    },
    name: string
  ) {
    const modelPath = basePath(`app/Models/${name}.ts`);
    const stubPath = honovelPath("stubs/Model.stub");
    const stubContent = getFileContents(stubPath);
    const modelContent = stubContent.replace(/{{ ClassName }}/g, name);

    writeFile(modelPath, modelContent);
    console.log(
      `✅ Model file created at ${path.relative(Deno.cwd(), modelPath)}`
    );

    if (options.migration || options.all) {
      this.makeMigration({}, generateTableName(name));
    }

    if (options.factory || options.all) {
      // Logic to create factory
      console.log(`Factory creation logic not implemented yet.`);
    }

    if (options.controller || options.all) {
      await this.makeController(
        { resource: options.resource },
        `${name}Controller`
      );
    }
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
      await DB.insert(`migrations`, {
        name,
        batch: batchNumber,
      });
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
      if (!empty(isApplied) && (isApplied[0] as { count: number }).count > 0) {
        console.log(`Migration ${name} already applied.`);
        continue;
      }
      await migration.run(type);
      await DB.insert("migrations", {
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
    await DB.statement(sql);
  }

  private async dropAllTables(): Promise<void> {
    const dbType = env("DB_CONNECTION", "mysql").toLowerCase();
    let tables: string[] = [];

    switch (dbType) {
      case "mysql": {
        const result = await DB.select(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
          [staticConfig("database.connections.mysql.database")]
        );
        tables = result.map((row) => `\`${row.TABLE_NAME}\``);
        break;
      }

      case "pgsql": {
        const result = await DB.select(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
        );
        tables = result.map((row) => `"${row.tablename}"`);
        break;
      }

      case "sqlite": {
        const result = await DB.select(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
        );
        tables = result.map((row) => `"${row.name}"`);
        break;
      }

      case "sqlsrv": {
        const result = await DB.select(`SELECT name FROM sys.tables`);
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
        await DB.statement(`DROP TABLE ${table};`);
      }
    } else {
      const dropSQL = `DROP TABLE ${tables.join(", ")};`;
      await DB.statement(dropSQL);
    }
  }

  private makeMigration(options: { table?: string }, name: string) {
    const isAlter = !!options?.table;
    const stubPath = isAlter
      ? honovelPath("stubs/MigrationAlter.stub")
      : honovelPath("stubs/MigrationCreate.stub");

    const stubContent = getFileContents(stubPath);
    const timestamp = date("YmdHis");
    const migrationName = isAlter
      ? `${timestamp}_alter_${name}.ts`
      : `${timestamp}_create_${name}.ts`;
    const table = options.table || name;

    const migrationContent = stubContent.replace(/{{ TableName }}/g, table);

    writeFile(
      basePath(`database/migrations/${migrationName}`),
      migrationContent
    );
    console.log(
      `✅ Migration file created at database/migrations/${migrationName}`
    );
  }

  private async serve(options: { port: number; host: string }) {
    const port = options.port;
    const serverPath = "vendor/honovel/framework/src/hono/run-server.ts";

    const cmd = new Deno.Command("deno", {
      args: ["run", "-A", "--watch=mode=poll", serverPath],
      stdout: "inherit",
      stderr: "inherit",
      env: {
        PORT: String(port),
        HOSTNAME: options.host,
        ...Deno.env.toObject(), // preserve existing env
        APP_URL: `http://${options.host}:${port}`,
      },
    });

    // console.log(`http://${options.host}:${port}`);

    const process = cmd.spawn();
    const status = await process.status;
    Deno.exit(status.code);
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

      .command("make:migration", "Generate a migration file")
      .arguments("<name:string>")
      .option(
        "--table <table:string>",
        "Specify the table to alter in the migration"
      )
      .action((options, name) => this.makeMigration(options, name))

      .command("migrate", "Run the database migrations")
      .option("--seed", "Seed the database after migration")
      .option("--path <path:string>", "Specify a custom migrations directory")
      .action((options) => this.runMigrations.bind(this)(options))

      .command("make:model", "Generate a model class")
      .arguments("<name:string>")
      .option("-m, --migration", "Also generate a migration file")
      .option("-f, --factory", "Also generate a factory file")
      .option("-c, --controller", "Also generate a controller")
      .option("-r, --resource", "Make the controller resourceful")
      .option("--all", "Generate migration, factory, and controller")
      .option("--pivot", "Indicate the model is a pivot table")
      .action((options, name) => this.makeModel(options, name))

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

      .command("serve", "Start the Honovel server")
      .option("--port <port:number>", "Port to run the server on", {
        default: env("PORT", 2000),
      })
      .option("--host <host:string>", "Host to run the server on", {
        default: "0.0.0.0",
      })
      .action((options) => this.serve.bind(this)(options))

      .parse(args);
  }
}

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

  // Sort modules by name to ensure consistent order
  modules.sort((a, b) => a.name.localeCompare(b.name));

  return modules;
}

const Artisan: IMyArtisan = new MyArtisan();

export default Artisan;
