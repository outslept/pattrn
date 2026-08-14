import { defineConfig } from "vite";
import devServer from "@hono/vite-dev-server";

export default defineConfig({
  plugins: [
    devServer({
      entry: "./src/server.ts",
    }),
  ],
  build: {
    ssr: true,
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "./src/server.ts",
      output: {
        entryFileNames: "server.js",
      },
    },
  },
  ssr: {
    target: "node",
  },
});
