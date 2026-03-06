#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Config File Watcher
 *
 * Automatically rebuilds config/build/myConfig.ts when any config file changes.
 * Run this during development to keep your config bundle up-to-date.
 *
 * Usage:
 *   deno task watch:config
 */

import * as path from "node:path";

const CONFIG_DIR = "./config";
const EXCLUDE_DIRS = ["build", "@types"];
let isRebuilding = false;

async function runPublishConfig() {
  if (isRebuilding) return;

  isRebuilding = true;
  console.log("\n🔄 Config files changed, rebuilding...");

  try {
    const command = new Deno.Command("deno", {
      args: ["task", "smelt", "publish:config"],
      stdout: "inherit",
      stderr: "inherit",
    });

    const { code } = await command.output();

    if (code === 0) {
      console.log("✅ Config rebuilt successfully!\n");
    } else {
      console.error("❌ Config rebuild failed!\n");
    }
  } catch (error) {
    console.error("❌ Error running publish:config:", error);
  } finally {
    isRebuilding = false;
  }
}

// Initial build on startup
console.log("🚀 Starting config watcher...");
console.log(`📂 Watching: ${CONFIG_DIR}`);
console.log(`🚫 Excluding: ${EXCLUDE_DIRS.join(", ")}\n`);

await runPublishConfig();

// Watch for changes
const watcher = Deno.watchFs(CONFIG_DIR);

for await (const event of watcher) {
  // Filter out non-modify events and excluded directories
  if (event.kind !== "modify" && event.kind !== "create") continue;

  // Check if any changed file is a .ts file in the config directory (not in excluded dirs)
  const relevantChanges = event.paths.filter((filePath) => {
    const relativePath = path.relative(CONFIG_DIR, filePath);
    const parts = relativePath.split(path.sep);

    // Exclude files in build/ or @types/ directories
    if (EXCLUDE_DIRS.some((dir) => parts[0] === dir)) {
      return false;
    }

    // Only watch .ts files
    return filePath.endsWith(".ts");
  });

  if (relevantChanges.length > 0) {
    console.log(
      `📝 Detected changes in: ${relevantChanges.map((p) => path.basename(p)).join(", ")}`,
    );
    await runPublishConfig();
  }
}
