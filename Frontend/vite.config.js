import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: false,
    }),
    tailwindcss(),
    mode === "analyze" &&
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: "dist/stats.html",
      }),
  ].filter(Boolean),

  assetsInclude: ["**/*.json"],

  resolve: {
    alias: {
      "@": "/src",
      "@pages": "/src/pages",
      "@components": "/src/components",
      "@layout": "/src/layout",
      "@auth": "/src/auth",
    },
  },

  build: {
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 600,
    target: "esnext",

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "react-core";
          }
          if (
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/@remix-run")
          ) {
            return "router";
          }
          if (
            id.includes("node_modules/@tanstack") ||
            id.includes("node_modules/axios") ||
            id.includes("node_modules/swr")
          ) {
            return "data-fetching";
          }
          if (
            id.includes("node_modules/framer-motion") ||
            id.includes("node_modules/@headlessui") ||
            id.includes("node_modules/@radix-ui") ||
            id.includes("node_modules/lucide-react") ||
            id.includes("node_modules/react-icons")
          ) {
            return "ui-libs";
          }
          if (
            id.includes("node_modules/date-fns") ||
            id.includes("node_modules/dayjs") ||
            id.includes("node_modules/lodash")
          ) {
            return "utils";
          }
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/chart.js") ||
            id.includes("node_modules/d3")
          ) {
            return "charts";
          }
          if (id.includes("node_modules")) {
            return "vendor-misc";
          }
        },

        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },

    esbuildOptions: {
      legalComments: "none",
      treeShaking: true,
    },
  },

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: false,
      ignored: ["**/node_modules/**", "**/dist/**"],
    },
    hmr: {
      protocol: "ws",
      host: "localhost",
      overlay: true,
    },
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
    ],
    exclude: [],
  },

  preview: {
    port: 4173,
    strictPort: true,
  },
}));