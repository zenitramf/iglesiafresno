/**
 * Prints the QR entry URL for the connection form.
 *
 * Usage:
 *   pnpm connect:url
 *   QR_CONNECT_SECRET=... node --experimental-strip-types scripts/connect-qr-url.mjs
 *
 * Encode the printed URL in the QR code that gets shown at church. Rotating
 * `QR_CONNECT_SECRET` invalidates the old QR code and every open gate cookie.
 */
import { readFileSync } from "node:fs";

import { deriveConnectEntryToken } from "../src/lib/connect-gate.ts";

const SITE_URL = "https://iglesiafresno.com";

const readSecret = () => {
  if (process.env.QR_CONNECT_SECRET) {
    return process.env.QR_CONNECT_SECRET;
  }
  try {
    const vars = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8");
    for (const line of vars.split("\n")) {
      const match = line.match(/^\s*QR_CONNECT_SECRET\s*=\s*(.+?)\s*$/);
      if (match) {
        return match[1].replaceAll(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Fall through to the error below.
  }
  return "";
};

const secret = readSecret();
if (!secret) {
  console.error(
    "Falta QR_CONNECT_SECRET. Define la variable o crea .dev.vars (ver .dev.vars.example).",
  );
  process.exit(1);
}

const token = await deriveConnectEntryToken(secret);
console.log(`${SITE_URL}/qr/${token}`);
