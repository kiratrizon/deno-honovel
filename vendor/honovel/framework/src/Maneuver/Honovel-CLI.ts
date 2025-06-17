import "../hono-globals/index.ts";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts";

const myCommand = new Command();

import { IMyArtisan } from "../@hono-types/IMyArtisan.d.ts";
class MyArtisan {
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

  public async command(args: string[]): Promise<void> {
    await myCommand
      .name("Honovel")
      .description("Honovel CLI")
      .version(FRAMEWORK_VERSION)
      .command("make:config", "Make a new config file")
      .arguments("<name:string>")
      .option("--force", "Force overwrite existing config file")
      .action(this.createConfig) // ✅

      .command("make:controller", "Generate a controller file")
      .arguments("<name:string>")
      .option(
        "--resource",
        "Generate a resourceful controller (index, create, store, etc.)"
      )
      .action(this.makeController) // ✅

      .command(
        "publish:config",
        "Build your configs in config/build/myConfig.ts"
      )
      .action(this.publishConfig) // ✅
      .parse(args);
  }
}

const Artisan: IMyArtisan = new MyArtisan();

export default Artisan;
