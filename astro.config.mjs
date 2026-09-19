import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [sitemap()],
  server: {
    allowedHosts: ["fresnovictory.ngrok.app"],
  },
  site: "https://iglesiafresno.com",
  trailingSlash: "ignore",
  vite: {
    plugins: [tailwindcss()],
  },
});
