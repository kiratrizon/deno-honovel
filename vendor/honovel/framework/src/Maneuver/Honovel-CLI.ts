import "../hono-globals/index.ts";

import { Command } from "@cliffy/command";
import { Migration } from "Illuminate/Database/Migrations/index.ts";
import { DB, Schema } from "Illuminate/Support/Facades/index.ts";
import { Confirm } from "@cliffy/prompt";
import { toFileUrl } from "jsr:@std/path@0.224.0";

const myCommand = new Command();

import { IMyArtisan } from "../../../@types/IMyArtisan.d.ts";
import * as path from "node:path";
import { envs } from "../../../../../environment.ts";
import PreventRequestDuringMaintenance from "Illuminate/Foundation/Http/Middleware/PreventRequestDuringMaintenance.ts";
import { Encrypter, EnvUpdater } from "Illuminate/Encryption/index.ts";
import { DatabaseHelper } from "Database";
import Seeder from "Illuminate/Database/Seeder.ts";
import Boot from "./Boot.ts";

await Boot.init();
class MyArtisan {
  constructor() {}
  private async createConfig(options: { force?: boolean }, name: string) {
    const stubPath = honovelPath("stubs/ConfigDefault.stub");
    const stubContent = getFileContents(stubPath);
    if (!options.force) {
      if (await pathExist(basePath(`config/${name}.ts`))) {
        consoledeno.error(
          `Config file ${basePath(`config/${name}.ts`)} already exist.`
        );
        return;
      }
    }
    writeFile(basePath(`config/${name}.ts`), stubContent);
    consoledeno.success(
      `${options.force ? "Overwrote" : "File created at"} ${basePath(
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
      output += `import ${name} from "configs/${name}.ts";\n`;
    }
    output += `\nexport default {\n`;
    for (const name of modules) {
      output += `  ${name},\n`;
    }
    output += `};\n`;
    if (!(await pathExist(basePath("config/build")))) {
      makeDir(basePath("config/build"));
    }
    writeFile(basePath("config/build/myConfig.ts"), output);
    consoledeno.success(`Generated ${basePath("config/build/myConfig.ts")}`);
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
    consoledeno.success(
      `Controller file created at ${path.relative(
        Deno.cwd(),
        basePath(`app/Http/Controllers/${name}.ts`)
      )}`
    );
    return;
  }

  private async getBatchNumber(db: string): Promise<number> {
    const result = await DB.connection(db)
      .table("migrations")
      .select(DB.raw("MAX(batch) as max_batch"))
      .first();

    const maxBatch =
      result?.max_batch !== null && result?.max_batch !== undefined
        ? Number(result.max_batch)
        : 0;

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
    consoledeno.success(
      `Model file created at ${path.relative(Deno.cwd(), modelPath)}`
    );

    if (options.migration || options.all) {
      this.makeMigration({}, generateTableName(name));
    }

    if (options.controller || options.all) {
      await this.makeController(
        { resource: options.resource },
        `${name}Controller`
      );
    }
    if (options.pivot) {
      // Logic to handle pivot model creation
      consoledeno.info(`Pivot model creation logic not implemented yet.`);
    }
    // factory
    if (options.factory || options.all) {
      await this.makeFactory({ model: name }, `${name}Factory`);
    }
  }

  private async askIfDBNotExist(connection: string) {
    const dbHelper = new DatabaseHelper(connection);
    if (!(await dbHelper.askIfDBExist())) {
      const dbName = dbHelper.getDatabaseName();
      const createDB = await Confirm.prompt(
        `Database \`${dbName}\` does not exist. Do you want to create it?`
      );
      if (createDB) {
        await dbHelper.createDatabase();
        consoledeno.success(`Database \`${dbName}\` created successfully.`);
      } else {
        consoledeno.error("Migration aborted due to missing database.");
        Deno.exit(1);
      }
    }
  }

  private async runMigrations(options: {
    seed?: boolean;
    path?: string;
    db: string;
    force: boolean;
    seeder?: string;
  }) {
    if (!options.force) {
      await this.askIfDBNotExist(options.db);
    }
    await this.createMigrationTable(options.db);
    const modules = await loadMigrationModules(options.path);
    const batchNumber = await this.getBatchNumber(options.db);

    const type = "up"; // or "down" based on your requirement
    for (const module of modules) {
      const { name, migration } = module;
      // need query
      const isApplied = await DB.connection(options.db)
        .table("migrations")
        .where("name", name)
        .count();
      if (isApplied) {
        consoledeno.info(`Migration ${name} already applied.`);
        continue;
      }
      migration.setConnection(options.db);
      await migration.run(type);
      await DB.connection(options.db).insert("migrations", {
        name,
        batch: batchNumber,
      });
      consoledeno.success(`Migration ${name} applied successfully.`);
    }
    if (options.seed) {
      if (!options.seeder) {
        options.seeder = "DatabaseSeeder";
      }
      await this.runSeed({
        seederClass: options.seeder,
        db: options.db,
      });
    }
  }

  private async freshMigrations(options: {
    seed?: boolean;
    path?: string;
    db: string;
    force: boolean;
    seeder?: string;
  }) {
    if (!options.force) {
      await this.askIfDBNotExist(options.db);
    }
    await this.dropAllTables(options.db);
    await this.createMigrationTable(options.db);
    const modules = await loadMigrationModules(options.path);
    const batchNumber = await this.getBatchNumber(options.db);
    const type = "up"; // or "down" based on your requirement
    for (const module of modules) {
      const { name, migration } = module;
      // need query
      const isApplied = await DB.connection(options.db)
        .table("migrations")
        .where("name", name)
        .count();
      if (isApplied) {
        consoledeno.info(`Migration ${name} already applied.`);
        continue;
      }
      migration.setConnection(options.db);
      await migration.run(type);
      await DB.connection(options.db).insert("migrations", {
        name,
        batch: batchNumber,
      });
      consoledeno.success(`Migration ${name} applied successfully.`);
    }
    if (options.seed) {
      if (!options.seeder) {
        options.seeder = "DatabaseSeeder";
      }
      await this.runSeed({
        seederClass: options.seeder,
        db: options.db,
      });
    }
  }

  private async refreshMigrations(options: {
    seed?: boolean;
    step?: number;
    path?: string;
    db: string;
    force: boolean;
    seeder?: string;
  }) {
    if (!options.force) {
      await this.askIfDBNotExist(options.db);
    }
    await this.createMigrationTable(options.db);

    const extractModule: string[] = [];
    if (options.step && options.step > 0) {
      const batchRows = await DB.connection(options.db)
        .table("migrations")
        .select("batch")
        .groupBy("batch")
        .orderBy("batch", "desc")
        .limit(options.step)
        .get();
      const batches = batchRows.map((row) => row.batch);
      if (batches.length) {
        const batchMigrations = await DB.connection(options.db)
          .table("migrations")
          .whereIn("batch", batches)
          .select("name")
          .orderBy("id", "desc")
          .get();

        extractModule.push(...batchMigrations.map((row) => row.name as string));
      }
    }

    const modules = await loadMigrationModules(options.path, extractModule);
    if (modules.length === 0) {
      consoledeno.info("No migrations found to refresh.");
      return;
    }
    consoledeno.info(`Rolling back ${modules.length} migrations...`);
    for (const module of modules) {
      const { name, migration } = module;
      // need query
      migration.setConnection(options.db);
      await migration.run("down");
      // delete migration record
      await DB.connection(options.db)
        .table("migrations")
        .where("name", name)
        .delete();
      consoledeno.success(`Migration ${name} rolled back successfully.`);
    }

    consoledeno.info(`Re-running migrations...`);
    const batchNumber = await this.getBatchNumber(options.db);
    for (const module of modules) {
      const { name, migration } = module;
      // need query
      const isApplied = await DB.connection(options.db)
        .table("migrations")
        .where("name", name)
        .count();
      if (isApplied) {
        consoledeno.info(`Migration ${name} already applied.`);
        continue;
      }
      migration.setConnection(options.db);
      await migration.run("up");
      await DB.connection(options.db).insert("migrations", {
        name,
        batch: batchNumber,
      });
      consoledeno.success(`Migration ${name} applied successfully.`);
    }

    if (options.seed) {
      if (!options.seeder) {
        options.seeder = "DatabaseSeeder";
      }
      await this.runSeed({
        seederClass: options.seeder,
        db: options.db,
      });
    }
  }

  private async createMigrationTable(connection: string) {
    const tableName = "migrations";
    const migrationClass = new (class extends Migration {
      async up() {
        if (!(await Schema.hasTable(tableName, this.connection))) {
          await Schema.create(
            tableName,
            (table) => {
              table.id();
              table.string("name").unique();
              table.integer("batch");
              table.timestamps();
            },
            this.connection
          );
        }
      }

      async down() {
        await Schema.dropIfExists(tableName, this.connection);
      }
    })();
    migrationClass.setConnection(connection);
    await migrationClass.up();
  }

  private async dropAllTables(connection: string): Promise<void> {
    let tables: string[] = [];
    const dbType = DB.connection(connection).getDriverName();
    switch (dbType) {
      case "mysql": {
        const result = await DB.connection(dbType).select(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
          [config("database.connections.mysql.database")]
        );
        tables = result.map((row) => `\`${row.TABLE_NAME}\``);
        break;
      }

      case "pgsql": {
        const result = await DB.connection(connection).select(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
        );
        tables = result.map((row) => `"${row.tablename}"`);
        break;
      }

      case "sqlite": {
        const result = await DB.connection(connection).select(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
        );
        tables = result.map((row) => `"${row.name}"`);
        break;
      }

      case "sqlsrv": {
        const result = await DB.connection(connection).select(
          `SELECT name FROM sys.tables`
        );
        tables = result.map((row) => `[${row.name}]`);
        break;
      }

      default:
        throw new Error(`Unsupported DB type: \`${dbType}\``);
    }

    if (tables.length === 0) {
      consoledeno.info("⚠️ No tables found to drop.");
      return;
    }

    if (dbType === "sqlite") {
      for (const table of tables) {
        await DB.connection(connection).statement(`DROP TABLE ${table};`);
      }
    } else {
      const dropSQL = `DROP TABLE ${tables.join(", ")};`;
      await DB.connection(connection).statement(dropSQL);
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
    consoledeno.success(
      `Migration file created at database/migrations/${migrationName}`
    );
  }

  private async serve(options: {
    port?: number | null | string;
    host: string;
  }) {
    const port = options.port;
    const serverPath = "vendor/honovel/framework/src/hono/run-server.ts";

    const envObj = {
      HOSTNAME: options.host,
    };
    if (isset(port)) {
      // @ts-ignore //
      envObj.PORT = String(port);
    }
    const envWatch = envs.map((env) => env).join(",");
    let watchFlag = "";
    if (!empty(envWatch)) {
      watchFlag = `=${envWatch}`;
    }

    const HOSTNAME = envObj.HOSTNAME;

    const isPortAvailable = async (port: number): Promise<boolean> => {
      try {
        const listener = Deno.listen({ port });
        listener.close();
        return true; // Port is available
      } catch (error) {
        if (error instanceof Deno.errors.AddrInUse) {
          return false; // Port is already in use
        }
        throw error; // Unexpected error
      }
    };

    const key = getFileContents(storagePath("ssl/key.pem"));
    const cert = getFileContents(storagePath("ssl/cert.pem"));
    const hasCert = !empty(key) && !empty(cert);
    const finalPort = port ? Number(port) : hasCert ? 443 : 80;

    const buildAppUrl = (
      hostname: string,
      port: number,
      hasCert: boolean,
      path: string = "/__warmup"
    ): string => {
      const protocol = hasCert ? "https" : "http";
      let host = hostname || "localhost";

      const defaultPort = hasCert ? 443 : 80;
      const portPart = port === defaultPort ? "" : `:${port}`;

      return `${protocol}://${host}${portPart}${path}`;
    };

    // @ts-ignore //
    envObj.PORT = String(finalPort);
    if (!(await isPortAvailable(finalPort))) {
      console.error(
        `Port ${finalPort} is already in use. Please choose a different port.`
      );
      Deno.exit(1);
    }

    const APP_URL = buildAppUrl(
      HOSTNAME || "",
      finalPort,
      hasCert,
      "/"
    ).replace(/\/$/, "");
    let envPath: string | undefined | null = basePath(".env");
    try {
      const environment = await import("../../../../../environment.ts");
      envPath = environment.default.envPath;
    } catch {
      // If environment.ts doesn't exist, use default envPath
    }
    EnvUpdater.updateAppUrl(envPath as string, APP_URL);

    // @ts-ignore //
    const WARMUP_URL = jsonEncode([
      buildAppUrl(HOSTNAME || "", finalPort, hasCert, "/__warmup"),
      buildAppUrl(HOSTNAME || "", finalPort, hasCert, "/api/__warmup"),
    ]);

    // write to .json file
    const warmupJsonPath = basePath("storage/honovel/warmup.json");
    // mkdir first
    Deno.mkdirSync(path.dirname(warmupJsonPath), { recursive: true });

    Deno.writeTextFileSync(warmupJsonPath, WARMUP_URL);
    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "--config",
        "./deno.json",
        "-A",
        `--watch${watchFlag}`,
        serverPath,
      ],
      stdout: "inherit",
      stderr: "inherit",
      env: envObj,
    });

    // console.log(`http://${options.host}:${port}`);

    const process = cmd.spawn();
    const status = await process.status;
    Deno.exit(status.code);
  }

  private makeProvider(name: string) {
    const stubPath = honovelPath("stubs/Provider.stub");
    const stubContent = getFileContents(stubPath);
    const providerContent = stubContent.replace(/{{ ClassName }}/g, name);

    writeFile(appPath(`/Providers/${name}.ts`), providerContent);
    consoledeno.success(
      `Provider file created at ${path.relative(
        Deno.cwd(),
        appPath(`/Providers/${name}.ts`)
      )}`
    );
  }

  private async makeMiddleware(name: string) {
    const stubPath = honovelPath("stubs/Middleware.stub");
    const stubContent = getFileContents(stubPath);
    const middlewareContent = stubContent.replace(/{{ ClassName }}/g, name);

    writeFile(appPath(`/Http/Middlewares/${name}.ts`), middlewareContent);
    consoledeno.success(
      `Middleware file created at ${path.relative(
        Deno.cwd(),
        appPath(`/Http/Middlewares/${name}.ts`)
      )}`
    );
  }

  private async runSeed({
    seederClass = "DatabaseSeeder",
    db = DB.getDefaultConnection(),
  }: {
    seederClass?: string;
    db?: string;
  }) {
    const seederClassPath = databasePath(`seeders/${seederClass}.ts`);
    const convertToFileUrl = toFileUrl(seederClassPath).href;
    const moduleSeeder = await import(convertToFileUrl);
    if (!moduleSeeder.default) {
      consoledeno.error(`Seeder class ${seederClass} not found.`);
      return;
    }
    const SeederClass = new moduleSeeder.default() as Seeder;
    SeederClass.setConnection(db);
    try {
      consoledeno.info(`Running seeder: ${seederClass} on database: ${db}`);
      await SeederClass.run();
      consoledeno.success(`Seeding completed successfully.`);
    } catch (err) {
      consoledeno.error(`Error running ${seederClass}:`, err);
    }
  }

  private async makeFactory(
    option: {
      model?: string;
    },
    name: string
  ) {
    const stub = isset(option.model)
      ? honovelPath("stubs/FactoryModel.stub")
      : honovelPath("stubs/Factory.stub");
    const stubContent = getFileContents(stub);
    let factoryContent = stubContent.replace(/{{ ClassName }}/g, name);
    if (isset(option.model)) {
      factoryContent = factoryContent.replace(/{{ ModelName }}/g, option.model);
    }
    writeFile(databasePath(`factories/${name}.ts`), factoryContent);

    consoledeno.success(
      `Factory file created at ${path.relative(
        Deno.cwd(),
        databasePath(`factories/${name}.ts`)
      )}`
    );
  }

  private async makeView(name: string) {
    // no stub for view, just create empty file
    const view = viewPath(`${name}.edge`);
    writeFile(view, "");
    consoledeno.success(
      `View file created at ${path.relative(Deno.cwd(), view)}`
    );
  }

  public async command(args: string[]): Promise<void> {
    await myCommand
      .name("deno task")
      .description("Honovel CLI")
      .version(frameworkVersion().honovelVersion)
      .command("db:seed", "Run the database seeds")
      .option("--class <class:string>", "Specify the seeder class to run")
      .option(
        "--database <db:string>",
        "Specify the database connection to use"
      )
      .action((options: { class?: string; database?: string }) =>
        this.runSeed.bind(this)({
          seederClass: options.class,
          db: options.database,
        })
      )
      .command("key:generate", "Generate a new application key")
      .option("--force", "Force overwrite existing APP_KEY")
      .option(
        "--env <env:string>",
        "Specify the environment name (e.g. staging, production)"
      )
      .action((options: { force?: boolean; env?: string }) => {
        const envPath = options.env ? `.env.${options.env}` : ".env";
        Encrypter.generateAppKey(envPath, options.force);
      })
      .command("make:config", "Make a new config file")
      .arguments("<name:string>")
      .option("--force", "Force overwrite existing config file")
      .action((options: { force?: boolean }, name: string) =>
        this.createConfig.bind(this)(options, name)
      )
      .command("make:controller", "Generate a controller file")
      .arguments("<name:string>")
      .option(
        "--resource",
        "Generate a resourceful controller (index, create, store, etc.)"
      )
      .action((options: { resource?: boolean }, name: string) =>
        this.makeController.bind(this)(options, name)
      )
      .command("make:factory", "Generate a factory file")
      .arguments("<name:string>")
      .option(
        "--model <model:string>",
        "Specify the model to associate with the factory"
      )
      .action((options: { model?: string }, name: string) =>
        this.makeFactory.bind(this)(options, name)
      )
      .command("make:migration", "Generate a migration file")
      .arguments("<name:string>")
      .option(
        "--table <table:string>",
        "Specify the table to alter in the migration"
      )
      .action((options: { table?: string }, name: string) =>
        this.makeMigration(options, name)
      )
      .command("migrate", "Run the database migrations")
      .option("--seed", "Seed the database after migration")
      .option("--path <path:string>", "Specify a custom migrations directory")
      .option("--db <db:string>", "Specify the database connection to use")
      .option("--force", "Force the migration without confirmation")
      .option(
        "--seeder <seeder:string>",
        "Specify a seeder class to run after migration"
      )
      .action((options: any) => {
        const db: string =
          (options.db as string) ||
          (config("database").default as string) ||
          "mysql";
        return this.runMigrations({
          ...options,
          db,
          force: options.force || false,
        });
      })
      .command("make:middleware", "Generate a middleware class")
      .arguments("<name:string>")
      .action((_: unknown, name: string) => this.makeMiddleware(name))
      .command("make:model", "Generate a model class")
      .arguments("<name:string>")
      .option("-m, --migration", "Also generate a migration file")
      .option("-f, --factory", "Also generate a factory file")
      .option("-c, --controller", "Also generate a controller")
      .option("-r, --resource", "Make the controller resourceful")
      .option("--all", "Generate migration, factory, and controller")
      .option("--pivot", "Indicate the model is a pivot table")
      .action(
        (
          options: {
            migration?: boolean;
            factory?: boolean;
            controller?: boolean;
            resource?: boolean;
            all?: boolean;
            pivot?: boolean;
          },
          name: string
        ) => this.makeModel(options, name)
      )
      .command(
        "make:provider",
        "Generate a service provider class for the application"
      )
      .arguments("<name:string>")
      .action((_: unknown, name: string) => this.makeProvider(name))

      .command("make:view", "Generate a view file")
      .arguments("<name:string>")
      .action((_: unknown, name: string) => this.makeView(name))

      .command("make:seeder", "Generate a seeder class")
      .arguments("<name:string>")
      .action((_: unknown, name: string) => {
        const stubPath = honovelPath("stubs/Seeder.stub");
        const stubContent = getFileContents(stubPath);
        const seederContent = stubContent.replace(/{{ ClassName }}/g, name);
        writeFile(databasePath(`seeders/${name}.ts`), seederContent);
        consoledeno.success(
          `Seeder file created at ${path.relative(
            Deno.cwd(),
            databasePath(`seeders/${name}.ts`)
          )}`
        );
      })
      .command("migrate:fresh", "Drop all tables and rerun all migrations")
      .option("--seed", "Seed the database after fresh migration")
      .option("--path <path:string>", "Specify a custom migrations directory")
      .option("--db <db:string>", "Specify the database connection to use")
      .option("--force", "Force the fresh migration without confirmation")
      .option(
        "--seeder <seeder:string>",
        "Specify a seeder class to run after fresh migration"
      )
      .action((options: any) => {
        const db: string =
          (options.db as string) ||
          (config("database").default as string) ||
          "mysql";
        return this.freshMigrations({
          ...options,
          db,
          force: options.force || false,
        });
      })
      .command("migrate:refresh", "Rollback and re-run all migrations")
      .option("--seed", "Seed the database after refresh")
      .option(
        "--step <step:number>",
        "Number of steps to rollback before migrating"
      )
      .option("--path <path:string>", "Specify a custom migrations directory")
      .option("--db <db:string>", "Specify the database connection to use")
      .option("--force", "Force the refresh migration without confirmation")
      .option(
        "--seeder <seeder:string>",
        "Specify a seeder class to run after refresh"
      )
      .action((options: any) => {
        const db: string =
          (options.db as string) ||
          (config("database").default as string) ||
          "mysql";
        return this.refreshMigrations({
          ...options,
          db,
          force: options.force || false,
        });
      })
      .command(
        "publish:config",
        "Build your configs in config/build/myConfig.ts"
      )
      .action(() => this.publishConfig.bind(this)())
      .command("serve", "Start the Honovel server")
      .option("--port <port:number>", "Port to run the server on", {
        default: env("PORT", null),
      })
      .option("--host <host:string>", "Host to run the server on", {
        default: "127.0.0.1",
      })
      .action((options: { port?: number | null | string; host: string }) =>
        this.serve.bind(this)(options)
      )
      // for maintenance mode
      .command("down", "Put the application into maintenance mode")
      .option(
        "--message <message:string>",
        "The message for the maintenance mode"
      )
      .option(
        "--retry <retry:number>",
        "Retry after seconds (adds Retry-After header)"
      )
      .option(
        "--allow <ip:string[]>",
        "IP addresses allowed to access the app during maintenance"
      )
      .option(
        "--secret <key:string>",
        "Secret bypass key for maintenance access"
      )
      .option(
        "--render <view:string>",
        "Custom view to render during maintenance"
      )
      .option("--redirect <url:string>", "Redirect URL during maintenance mode")
      .action(
        (options: {
          message?: string;
          retry?: number;
          allow?: string[];
          secret?: string;
          render?: string;
          redirect?: string;
        }) => this.down.bind(this)(options)
      )
      .command("up", "Bring the application out of maintenance mode")
      .action(() => this.up.bind(this)())
      .parse(args);
  }

  private async down(options: {
    message?: string;
    retry?: number;
    allow?: string[];
    secret?: string;
    render?: string;
    redirect?: string;
  }) {
    const store = new PreventRequestDuringMaintenance().getMaintenanceStore();

    if (!store) {
      consoledeno.error("Maintenance store is not configured.");
      return;
    }

    const maintenanceData = {
      message: options.message ?? "Application is in maintenance mode.",
      retry: options.retry ?? 60, // in seconds
      allow: options.allow ?? [],
      secret: options.secret ?? "",
      render: options.render ?? "",
      redirect: options.redirect ?? "/",
      timestamp: time(), // useful for logging/debugging
    };

    await store.forever("maintenance", maintenanceData);

    consoledeno.success("Application is now in maintenance mode.");

    if (maintenanceData.secret) {
      consoledeno.info(`🔑 Bypass URL: /${maintenanceData.secret}`);
    }
  }

  private async up() {
    const store = new PreventRequestDuringMaintenance().getMaintenanceStore();

    if (!store) {
      consoledeno.error("Maintenance store is not configured.");
      return;
    }

    await store.forget("maintenance");

    consoledeno.success("Application is now out of maintenance mode.");
  }
}

interface ModuleMigration {
  name: string;
  migration: Migration;
}

export async function loadMigrationModules(
  modulePath: string = "database/migrations",
  extractModule: string[] = []
): Promise<ModuleMigration[]> {
  const modules: ModuleMigration[] = [];
  const migrationsPath = basePath(modulePath);
  for await (const entry of Deno.readDir(migrationsPath)) {
    if (entry.isFile && entry.name.endsWith(".ts")) {
      const fullPath = path.join(migrationsPath, entry.name);
      const fileUrl = toFileUrl(fullPath).href;
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
  if (extractModule.length > 0) {
    const filteredModules: ModuleMigration[] = [];
    for (const module of modules) {
      if (extractModule.includes(module.name)) {
        filteredModules.push(module);
      }
    }
    return filteredModules;
  }

  return modules;
}

const Artisan: IMyArtisan = new MyArtisan();

export default Artisan;
