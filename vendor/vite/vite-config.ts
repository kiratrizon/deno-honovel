import tailwind from "@tailwindcss/vite";
import type { InlineConfig } from "vite";

const inlineConfig: InlineConfig = {
  plugins: [
    tailwind({
      optimize: {
        minify: true,
      },
    }),
  ],

  server: {
    port: 5173,
  },

  build: {
    outDir: "public/build",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: [
        "resources/ts/style.ts",
        "resources/ts/home.ts",
        "resources/ts/jquery.ts",
      ],
    },
  },
};

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
