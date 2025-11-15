import inlineConfig from "../../vite.ts";

if (!inlineConfig.build) {
  // @ts-ignore //
  inlineConfig.build = {};
  inlineConfig.build.outDir = "public/build";
}

// @ts-ignore //
if (!inlineConfig.build.outDir.startsWith("public")) {
  // remove leading slashes if any
  // @ts-ignore //
  inlineConfig.build.outDir = `public/${inlineConfig.build.outDir.replace(/^\/+/, "")}`;
}

// remove leading slashes from outDir
// @ts-ignore //
inlineConfig.build.outDir = inlineConfig.build.outDir.replace(/^\/+/, "");
export default inlineConfig;
