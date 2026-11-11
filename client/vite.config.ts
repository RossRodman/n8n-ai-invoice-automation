/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// INVOICE_API_KEY comes from the project's .env; the proxy adds it, so the browser never sees it.
const env = { ...loadEnv("development", "..", ["INVOICE_", "VITE_"]), ...process.env };
const N8N_TARGET = env.VITE_N8N_TARGET ?? "http://127.0.0.1:5678";
const API_KEY = env.INVOICE_API_KEY ?? "";

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
            { name: "mui", test: /node_modules[\\/](@mui[\\/](?!x-)|@emotion)/ },
            // Only the dashboard chart uses these; they load when it does.
            {
              name: "charts",
              test: /node_modules[\\/](@mui[\\/]x-|d3-|internmap|flatqueue|bezier-easing|use-sync-external-store)/,
            },
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
        headers: { "X-Api-Key": API_KEY },
      },
      "/healthz": { target: N8N_TARGET, changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
