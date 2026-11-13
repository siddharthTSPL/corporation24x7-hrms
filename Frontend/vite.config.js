import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  base: '/talent/',

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
        // Only React itself gets a pinned chunk (long-term cacheable, tiny).
        // Everything else is left to the bundler's automatic splitting so that
        // lazy routes keep their heavy libs (firebase, xlsx, jspdf, recharts,
        // country-state-city, leaflet...) OUT of the first page load.
        // The old catch-all "vendor-misc" bucket was ~11 MB and got
        // modulepreloaded by index.html on every page.
        manualChunks(id) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "react-core";
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
    strictPort: false,
    watch: {
      usePolling: false,
      ignored: ["**/node_modules/**", "**/dist/**"],
    },
    hmr: {
      protocol: "ws",
      host: "localhost",
      overlay: true,
    },

    proxy: {
      '/api': {
        target: 'http://146.101.46.205:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
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