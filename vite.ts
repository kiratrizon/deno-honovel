const inlineConfig = {
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
