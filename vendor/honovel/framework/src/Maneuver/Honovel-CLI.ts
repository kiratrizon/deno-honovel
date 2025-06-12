class MyArtisan {
  constructor() {}
  public async createConfig(options: { force?: boolean }, name: string) {
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

  public async publishConfig() {
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

  public async makeController(options: { resource?: boolean }, name: string) {
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
}

export default MyArtisan;
