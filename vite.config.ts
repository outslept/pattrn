import { defineConfig } from "vite";
import devServer from "@hono/vite-dev-server";

export default defineConfig({
  plugins: [
    devServer({
      entry: "./src/app.ts",
    }),
  ],
  build: {
    ssr: true,
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "./src/app.ts",
      output: {
        entryFileNames: "app.js",
      },
    },
  },
  ssr: {
    target: "node",
  },
});
