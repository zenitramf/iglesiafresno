/**
 * Request-level QR gate decision, with its analytics events. Kept apart from
 * `connect-gate.ts`, which must stay import-free (see that module).
 */
import type { AnalyticsEnv } from "@/lib/analytics";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  buildConnectCookieValue,
  CONNECT_ENTRY_PREFIX,
  CONNECT_PATH,
  GATE_REDIRECT_STATUS,
  isConnectEntryPath,
  isConnectPagePath,
  verifyConnectCookieValue,
  verifyConnectEntryToken,
  VISITANOS_PATH,
} from "@/lib/connect-gate";

export interface ConnectGateEnv extends AnalyticsEnv {
  QR_CONNECT_SECRET?: string;
}

export type ConnectGateDecision =
  | { action: "next" }
  | {
      action: "redirect";
      cookieValue?: string;
      location: string;
      status: typeof GATE_REDIRECT_STATUS;
    };

/**
 * Decides what to do with a gated request and records the matching
 * `qr_scan`, `gate_blocked` or `gate_view` event. Callers must only pass
 * paths for which `requiresConnectGate` is true.
 *
 * `gate_view` counts authorized page loads (reloads included), not unique
 * visitors, and only for the HTML pages, never `/api/conectar`.
 */
export const evaluateConnectGate = async (
  request: Request,
  cookieValue: string | undefined,
  env: ConnectGateEnv,
): Promise<ConnectGateDecision> => {
  const { pathname } = new URL(request.url);
  const secret = env.QR_CONNECT_SECRET ?? "";

  if (isConnectEntryPath(pathname)) {
    // Tokens are already base64url. Invalid percent escapes are simply
    // invalid tokens, not inputs to decodeURIComponent (which can throw).
    const token = pathname.slice(CONNECT_ENTRY_PREFIX.length);
    if (!(await verifyConnectEntryToken(token, secret))) {
      trackAnalyticsEvent(env, request, {
        detail: "invalid_token",
        event: "qr_scan",
        outcome: "invalid",
        path: "/qr",
        status: GATE_REDIRECT_STATUS,
      });
      return { action: "redirect", location: VISITANOS_PATH, status: GATE_REDIRECT_STATUS };
    }

    trackAnalyticsEvent(env, request, {
      detail: "cookie_issued",
      event: "qr_scan",
      outcome: "valid",
      path: "/qr",
      status: GATE_REDIRECT_STATUS,
    });
    return {
      action: "redirect",
      cookieValue: await buildConnectCookieValue(secret),
      location: CONNECT_PATH,
      status: GATE_REDIRECT_STATUS,
    };
  }

  if (!(await verifyConnectCookieValue(cookieValue, secret))) {
    trackAnalyticsEvent(env, request, {
      detail: cookieValue ? "invalid_or_expired_cookie" : "missing_cookie",
      event: "gate_blocked",
      outcome: "redirect_visitanos",
      path: pathname,
      status: GATE_REDIRECT_STATUS,
    });
    return { action: "redirect", location: VISITANOS_PATH, status: GATE_REDIRECT_STATUS };
  }

  if (request.method === "GET" && isConnectPagePath(pathname)) {
    trackAnalyticsEvent(env, request, {
      detail: "cookie_valid",
      event: "gate_view",
      outcome: "authorized",
      path: pathname,
      status: 200,
    });
  }

  return { action: "next" };
};
