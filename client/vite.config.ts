/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const N8N_TARGET = process.env.VITE_N8N_TARGET ?? "http://127.0.0.1:5678";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "mui", test: /node_modules[\\/](@mui|@emotion)/ },
            { name: "vendor", test: /node_modules/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: N8N_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/webhook"),
      },
      "/healthz": { target: N8N_TARGET, changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
