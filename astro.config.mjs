import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  server: {
    allowedHosts: ["fresnovictory.ngrok.app"],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
