import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  assetsInclude: ["**/*.json"],

  build: {
    sourcemap: false,

    minify: "esbuild",

    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },

  server: {
    host: true,
    port: 5173,

    watch: {
      usePolling: true,
    },

    hmr: {
      protocol: "ws",
      host: "localhost",
    },
  },
});