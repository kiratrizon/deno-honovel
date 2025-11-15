import { defineConfig, InlineConfig } from "vite";
import viteConfig from "./vendor/vite/vite-manipulate.ts";
import tailwind from "@tailwindcss/vite";

const plugins = [
  tailwind({
    optimize: {
      minify: true,
    },
  }),
];

(viteConfig as InlineConfig).plugins = plugins;

export default defineConfig(viteConfig);
