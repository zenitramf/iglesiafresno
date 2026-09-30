import { defineMiddleware } from "astro:middleware";

import {
  buildConnectCookieValue,
  CONNECT_COOKIE_MAX_AGE,
  CONNECT_COOKIE_NAME,
  CONNECT_ENTRY_PREFIX,
  CONNECT_PATH,
  GATE_REDIRECT_STATUS,
  isConnectEntryPath,
  isConnectGatePath,
  verifyConnectCookieValue,
  verifyConnectEntryToken,
  VISITANOS_PATH,
} from "@/lib/connect-gate";

/**
 * QR gate for the connection form.
 *
 * - `/qr/<token>` (the URL encoded in the printed QR code) exchanges a valid
 *   token for a signed, expiring cookie and redirects to `/conectar`.
 * - Gated paths require that cookie; anything else is redirected to
 *   `/visitanos` so typed, bookmarked or crawled URLs never reach the form.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isEntry = isConnectEntryPath(pathname);

  if (!isEntry && !isConnectGatePath(pathname)) {
    return next();
  }

  // Loaded lazily: middleware also runs at build time while prerendering the
  // static pages, which must not depend on the Cloudflare runtime.
  const { env } = await import("cloudflare:workers");
  const secret = env.QR_CONNECT_SECRET ?? "";

  if (isEntry) {
    // Tokens are already base64url. Invalid percent escapes are simply
    // invalid tokens, not inputs to decodeURIComponent (which can throw).
    const token = pathname.slice(CONNECT_ENTRY_PREFIX.length);
    if (!(await verifyConnectEntryToken(token, secret))) {
      return context.redirect(VISITANOS_PATH, GATE_REDIRECT_STATUS);
    }
    context.cookies.set(CONNECT_COOKIE_NAME, await buildConnectCookieValue(secret), {
      httpOnly: true,
      maxAge: CONNECT_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: context.url.protocol === "https:",
    });
    return context.redirect(CONNECT_PATH, GATE_REDIRECT_STATUS);
  }

  if (!(await verifyConnectCookieValue(context.cookies.get(CONNECT_COOKIE_NAME)?.value, secret))) {
    return context.redirect(VISITANOS_PATH, GATE_REDIRECT_STATUS);
  }

  return next();
});
