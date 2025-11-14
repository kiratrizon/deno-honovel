import { defineConfig } from "vite";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwind()],

  server: {
    port: 5173,
  },

  build: {
    outDir: "public/build",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        app: "resources/css/app.css",
      },
    },
  },
  publicDir: "public",
});
