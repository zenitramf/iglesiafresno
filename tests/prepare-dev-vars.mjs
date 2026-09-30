/**
 * Ensures a local `.dev.vars` exists before Playwright builds and previews the
 * site. `astro build` copies `.dev.vars` into the generated server output, and
 * the QR gate tests need `QR_CONNECT_SECRET` to be present.
 */
import { copyFileSync, existsSync } from "node:fs";

const target = new URL("../.dev.vars", import.meta.url);
const example = new URL("../.dev.vars.example", import.meta.url);

if (!existsSync(target)) {
  copyFileSync(example, target);
  console.log("tests/prepare-dev-vars.mjs: created .dev.vars from .dev.vars.example");
}
