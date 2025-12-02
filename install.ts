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

const repo = "kiratrizon/honovel";
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
// 📄 Create .env
// =====================

console.log(`\n🎉 Project created in: ${name}`);
console.log(
  `\n➡️  Next steps:\n  cd ${name}\n  deno install\n  deno task smelt serve`
);
