import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  /*
   * The connection form (`/conectar`, `/qr/*`, `/api/conectar`) renders on
   * demand so the QR gate, cookies and email delivery can run in the Worker.
   * Every other page stays prerendered and is served as a static asset.
   */
  adapter: cloudflare({
    // Keep Sharp for build-time image optimization of prerendered pages;
    // on-demand routes use the passthrough service (no Images binding needed).
    imageService: "compile",
    // Prerendering keeps running in Node so existing `astro:assets` pages build
    // exactly as they did before the adapter was added.
    prerenderEnvironment: "node",
  }),
  integrations: [
    sitemap({
      // The QR-gated connection form and the contact recovery page are not
      // landing pages: keep them out of the sitemap.
      filter: (page) => !/\/(conectar|contacto)(\/|$)/.test(new URL(page).pathname),
    }),
  ],
  // No Astro sessions are used — cookies are signed by hand in src/middleware.ts,
  // and this keeps the adapter from provisioning a SESSION KV namespace.
  session: false,
  server: {
    allowedHosts: ["fresnovictory.ngrok.app"],
  },
  site: "https://iglesiafresno.com",
  trailingSlash: "ignore",
  vite: {
    plugins: [tailwindcss()],
  },
});
