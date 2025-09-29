#!/usr/bin/env -S deno run -A

const args = Deno.args;

const [name, version = "latest"] = args[0]?.split("@") || [];

if (!name) {
  console.error(
    "Usage: deno run -A https://honovel.deno.dev/create-project <name>@<version>\n" +
      "Example: deno run -A https://honovel.deno.dev/create-project my-app@1.0.0"
  );
  Deno.exit(1);
}

const repo = "https://github.com/kiratrizon/deno-honovel.git";

// Map 'latest' to 'master'
const branch = version === "latest" ? "master" : version;

// Step 1: Clone repo
console.log(`📥 Cloning branch '${branch}'...`);
const cloneArgs = ["clone", "--branch", branch, repo, name];

const clone = new Deno.Command("git", {
  args: cloneArgs,
  stdout: "inherit",
  stderr: "inherit",
});
const child = clone.spawn();
const status = await child.status;
if (status.code !== 0) {
  console.error("❌ Git clone failed with code", status.code);
  Deno.exit(status.code);
}

// Step 2: Remove .git
await Deno.remove(`./${name}/.git`, { recursive: true });

// Step 3: Copy .env.example → .env
const envExamplePath = `./${name}/.env.example`;
const envPath = `./${name}/.env`;

try {
  await Deno.stat(envExamplePath);
  await Deno.copyFile(envExamplePath, envPath);
  console.log("✅ .env file created from .env.example");
} catch (err: any) {
  console.warn("⚠️ Skipping .env copy: " + err.message);
}

// Step 4: Migrate project using `honovel`
console.log("🚀 Running migration...");
const honovelPath = `./${name}/novel`;

try {
  await Deno.chmod(honovelPath, 0o755);
} catch {
  // It's okay if it fails (e.g. already executable)
}

try {
  const migrate = new Deno.Command(honovelPath, {
    args: ["migrate"],
    cwd: name,
    stdout: "inherit",
    stderr: "inherit",
  });
  await migrate.output();
  console.log("✅ Migration completed");
} catch (_err) {
  console.warn("⚠️ Migration failed. Trying as a TypeScript file...");

  try {
    const fallback = new Deno.Command("deno", {
      args: ["run", "-A", "honovel", "migrate"],
      cwd: name,
      stdout: "inherit",
      stderr: "inherit",
    });
    await fallback.output();
    console.log("✅ Migration completed (via deno run)");
  } catch (innerErr: any) {
    console.error("❌ Migration failed completely:", innerErr.message);
  }
}

// remove files from
const filesToRemove: Record<string, { except?: string[]; only?: string[] }> = {
  routes: {},
  "app/Http/Controllers": {
    except: ["Controller.ts"],
  },
  "app/Models": {
    except: ["User.ts"],
  },
  "database/migrations": {
    except: ["20250626180144_create_users.ts"],
  },
  "database/seeders": {
    except: ["DatabaseSeeder.ts"],
  },
  "database/factories": {
    except: ["UserFactory.ts"],
  },
  "resources/views": {
    except: ["welcome.edge"],
  },
  "": {
    only: ["genesis-troy-torrecampo.pdf"],
  },
};

for (const [dir, options] of Object.entries(filesToRemove)) {
  const fullDirPath = `./${name}${dir == "" ? "" : "/" + dir}`;
  try {
    for await (const entry of Deno.readDir(fullDirPath)) {
      if (entry.isFile) {
        if (options.except && options.except.includes(entry.name)) {
          continue;
        }
        if (options.only?.length) {
          if (options.only.includes(entry.name)) {
            await Deno.remove(`${fullDirPath}/${entry.name}`);
          }
        } else {
          await Deno.remove(`${fullDirPath}/${entry.name}`);
        }
      }
    }
  } catch (_err) {
    //
  }
}

const createWebApiText = `import { Route } from "Illuminate/Support/Facades/index.ts";`;

const routes = ["web.ts", "api.ts"];

for (const routeFile of routes) {
  const routeFilePath = `./${name}/routes/${routeFile}`;
  try {
    let content = await Deno.readTextFile(routeFilePath);
    if (!content.includes(createWebApiText)) {
      content = createWebApiText + "\n\n" + content;
      await Deno.writeTextFile(routeFilePath, content);
    }
  } catch (_err) {
    //
  }
}

console.log(`\n🎉 Project created in: ${name}`);
console.log(`\n➡️  Next steps:\n  cd ${name}\n  deno task smelt serve`);
