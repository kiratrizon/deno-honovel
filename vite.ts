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
  publicDir: "public/assets",
};

export default inlineConfig;
