import { defineMiddleware } from "astro:middleware";

import {
  CONNECT_COOKIE_MAX_AGE,
  CONNECT_COOKIE_NAME,
  requiresConnectGate,
} from "@/lib/connect-gate";
import { evaluateConnectGate } from "@/lib/connect-gate-decision";

/**
 * QR gate for the connection form.
 *
 * - `/qr/<token>` (the URL encoded in the printed QR code) exchanges a valid
 *   token for a signed, expiring cookie and redirects to `/conectar`.
 * - Gated paths require that cookie; anything else is redirected to
 *   `/visitanos` so typed, bookmarked or crawled URLs never reach the form.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  if (!requiresConnectGate(context.url.pathname)) {
    return next();
  }

  // Loaded lazily: middleware also runs at build time while prerendering the
  // static pages, which must not depend on the Cloudflare runtime.
  const { env } = await import("cloudflare:workers");
  const decision = await evaluateConnectGate(
    context.request,
    context.cookies.get(CONNECT_COOKIE_NAME)?.value,
    env,
  );

  if (decision.action === "redirect") {
    if (decision.cookieValue) {
      context.cookies.set(CONNECT_COOKIE_NAME, decision.cookieValue, {
        httpOnly: true,
        maxAge: CONNECT_COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax",
        secure: context.url.protocol === "https:",
      });
    }
    return context.redirect(decision.location, decision.status);
  }

  return next();
});
