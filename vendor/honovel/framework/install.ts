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

const repo = "kiratrizon/deno-honovel";
const branch = version === "latest" ? "master" : version;
const zipUrl = `https://github.com/${repo}/archive/refs/heads/${branch}.zip`;

console.log(`📦 Downloading ${repo}@${branch}...`);

const zipResponse = await fetch(zipUrl);
if (!zipResponse.ok) {
  console.error("❌ Failed to download ZIP:", zipResponse.statusText);
  Deno.exit(1);
}

const zipArray = new Uint8Array(await zipResponse.arrayBuffer());
await Deno.writeFile(`${name}.zip`, zipArray);

console.log("📂 Extracting ZIP...");

// Extract ZIP → temp folder
const extractDir = `${name}_tmp`;
await Deno.mkdir(extractDir, { recursive: true });

// Use system tar (works for .zip on all modern OS)
const unzip = new Deno.Command("tar", {
  args: ["-xf", `${name}.zip`, "-C", extractDir],
  stdout: "inherit",
  stderr: "inherit",
});
const unzipResult = await unzip.output();
if (unzipResult.code !== 0) {
  console.error("❌ Failed to extract ZIP file. Maybe tar is not installed?");
  Deno.exit(1);
}

// Find the subfolder (GitHub adds e.g. deno-honovel-master)
let extractedSubdir = "";
for await (const entry of Deno.readDir(extractDir)) {
  if (entry.isDirectory) {
    extractedSubdir = entry.name;
    break;
  }
}

if (!extractedSubdir) {
  console.error("❌ Could not find extracted folder.");
  Deno.exit(1);
}

// Move contents to final project folder
await Deno.rename(`${extractDir}/${extractedSubdir}`, name);
await Deno.remove(extractDir, { recursive: true });
await Deno.remove(`${name}.zip`);

console.log("✅ Extraction complete");

// =====================
// 🔧 Post-setup cleanup
// =====================

const filesToRemove: Record<string, { except?: string[]; only?: string[] }> = {
  routes: {},
  "app/Http/Controllers": {
    except: ["Controller.ts"],
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
        if (options.except && options.except.includes(entry.name)) continue;
        if (options.only?.length) {
          if (options.only.includes(entry.name)) {
            await Deno.remove(`${fullDirPath}/${entry.name}`);
          }
        } else {
          await Deno.remove(`${fullDirPath}/${entry.name}`);
        }
      }
    }
  } catch {
    // skip missing dirs
  }
}

console.log("🧹 Cleanup done");

// =====================
// 📄 Create .env
// =====================

const envExamplePath = `./${name}/.env.example`;
const envPath = `./${name}/.env`;

try {
  await Deno.stat(envExamplePath);
  await Deno.copyFile(envExamplePath, envPath);
  console.log("✅ .env file created from .env.example");
} catch (err: any) {
  console.warn("⚠️ Skipping .env copy: " + err.message);
}

// =====================
// 🧩 Add Route Facade
// =====================

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
  } catch {
    //
  }
}

// =====================
// 🧱 Run Migration
// =====================

console.log("🚀 Running migration...");
const honovelPath = `./${name}/novel`;
try {
  await Deno.chmod(honovelPath, 0o755);
  const migrate = new Deno.Command(honovelPath, {
    args: ["migrate"],
    cwd: name,
    stdout: "inherit",
    stderr: "inherit",
  });
  await migrate.output();
  console.log("✅ Migration completed");
} catch (_err) {
  console.warn("⚠️ Migration failed. Trying as TypeScript...");
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
    console.error(
      "❌ Migration failed completely:",
      innerErr.message ? innerErr.message : innerErr
    );
  }
}

console.log(`\n🎉 Project created in: ${name}`);
console.log(
  `\n➡️  Next steps:\n  cd ${name}\n  deno install\n  deno task smelt serve`
);
