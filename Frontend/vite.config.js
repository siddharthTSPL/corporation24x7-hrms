import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  assetsInclude: ["**/*.json"],

  build: {
    sourcemap: false, 
    minify: "terser", 

    terserOptions: {
      compress: {
        drop_console: true, 
        drop_debugger: true,
      },
    },

    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },

  server: {
    host: true,
    port: 5173,
  },
});