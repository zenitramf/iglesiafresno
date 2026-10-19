import {
  isCtaTarget,
  sanitizeAnalyticsPath,
  sanitizeCtaPlacement,
} from "@/lib/analytics-dimensions";
import {
  ALLOWED_HOW_HEARD_VALUES,
  ALLOWED_INTEREST_VALUES,
  filterAllowedFormOptions,
  readBoundedUtf8Body,
} from "@/lib/connect-form";

export const BEACON_MAX_BODY_BYTES = 1024;

export const ANALYTICS_EVENTS = [
  "qr_scan",
  "gate_view",
  "gate_blocked",
  "connect_submit",
  "contact_submit",
  "cta_click",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export interface AnalyticsDataPoint {
  blobs: string[];
  doubles: number[];
  indexes: [AnalyticsEventName];
}

export interface AnalyticsDatasetBinding {
  writeDataPoint: (event?: AnalyticsDataPoint) => void;
}

export interface AnalyticsEnv {
  ANALYTICS?: AnalyticsDatasetBinding;
}

export interface AnalyticsEventInput {
  /** Secondary context: error code, email transport, cookie/token state, or CTA placement. */
  detail?: string;
  event: AnalyticsEventName;
  /** Whether the connection card included a prayer request (boolean flag only, never text). */
  hasPrayer?: boolean;
  /** Allowlisted "how heard" categories selected on the connection card. */
  howHeard?: readonly string[];
  /** Allowlisted ministry interest categories selected on the connection card. */
  interests?: readonly string[];
  /** Primary result or target (e.g. `success`, `validation_error`, `maps`, `giving`). */
  outcome: string;
  /** Route or page path where the event occurred (tokens are stripped automatically). */
  path: string;
  /** HTTP status code associated with the event. */
  status?: number;
}

const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|headless|facebookexternalhit|preview|pingdom|uptime/i;
const MOBILE_UA_PATTERN = /mobi|android|iphone|ipad|ipod/i;
const ISO_COUNTRY_PATTERN = /^[A-Z]{2}$/;
const SAFE_TOKEN_PATTERN = /[^a-z0-9/_:-]+/gi;
const EDGE_UNDERSCORES_PATTERN = /^_+|_+$/g;

/** Sanitizes a short internal dimension token (`detail`, `outcome`). */
export const sanitizeAnalyticsToken = (value: string, fallback = "none"): string => {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replaceAll(SAFE_TOKEN_PATTERN, "_")
    .replaceAll(EDGE_UNDERSCORES_PATTERN, "")
    .slice(0, 48);
  return cleaned || fallback;
};

/** Coarse device bucket derived from headers without storing the raw User-Agent. */
export const detectDeviceCategory = (
  request: Request,
): "mobile" | "desktop" | "bot" | "unknown" => {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT_UA_PATTERN.test(userAgent)) {
    return "bot";
  }
  const chMobile = request.headers.get("sec-ch-ua-mobile");
  if (chMobile === "?1") {
    return "mobile";
  }
  if (chMobile === "?0") {
    return "desktop";
  }
  if (!userAgent) {
    return "unknown";
  }
  return MOBILE_UA_PATTERN.test(userAgent) ? "mobile" : "desktop";
};

/** Two-letter country code from Cloudflare edge metadata (`XX` when unavailable). */
export const detectCountry = (request: Request): string => {
  const cfCountry = (request as Request & { cf?: { country?: unknown } }).cf?.country;
  const raw =
    typeof cfCountry === "string" ? cfCountry : (request.headers.get("cf-ipcountry") ?? "");
  const upper = raw.trim().toUpperCase();
  return ISO_COUNTRY_PATTERN.test(upper) ? upper : "XX";
};

/**
 * Builds a fixed-width Cloudflare Workers Analytics Engine data point for the
 * `ibv_events` dataset.
 *
 * Schema layout:
 * - `index1`: event name
 * - `blob1`: event name (`qr_scan`, `gate_view`, `gate_blocked`, `connect_submit`, `contact_submit`, `cta_click`)
 * - `blob2`: outcome or CTA target (`valid`, `invalid`, `authorized`, `redirect_visitanos`, `success`, `validation_error`, `delivery_error`, `honeypot`, `maps`, `giving`, ...)
 * - `blob3`: allowlisted path (`/qr`, `/conectar`, `/visitanos`, ..., or `other`)
 * - `blob4`: detail (error code, email transport `resend` / `cloudflare`, cookie state, or allowlisted CTA placement)
 * - `blob5`: 2-letter ISO country code (`US`, `MX`, `XX`)
 * - `blob6`: coarse device category (`mobile`, `desktop`, `bot`, `unknown`)
 * - `blob7`: comma-separated allowlisted "how heard" categories (never free-text)
 * - `blob8`: comma-separated allowlisted ministry interest categories (never free-text)
 * - `double1`: event count (`1`)
 * - `double2`: HTTP status code (`200`, `204`, `302`, `303`, `422`, `502`, ...)
 * - `double3`: count of selected "how heard" options
 * - `double4`: count of selected ministry interest options
 * - `double5`: prayer request included flag (`1` or `0` on `connect_submit`; `0` for other events)
 */
export const buildAnalyticsDataPoint = (
  request: Request,
  input: AnalyticsEventInput,
): AnalyticsDataPoint => {
  const howHeard = filterAllowedFormOptions(input.howHeard, ALLOWED_HOW_HEARD_VALUES);
  const interests = filterAllowedFormOptions(input.interests, ALLOWED_INTEREST_VALUES);

  return {
    blobs: [
      input.event,
      sanitizeAnalyticsToken(input.outcome, "unknown"),
      sanitizeAnalyticsPath(input.path),
      sanitizeAnalyticsToken(input.detail ?? "none"),
      detectCountry(request),
      detectDeviceCategory(request),
      howHeard.join(","),
      interests.join(","),
    ],
    doubles: [1, input.status ?? 200, howHeard.length, interests.length, input.hasPrayer ? 1 : 0],
    indexes: [input.event],
  };
};

/**
 * Non-blocking helper that writes a structured event to Workers Analytics Engine.
 * Swallows any runtime binding error so telemetry never disrupts visitor traffic.
 */
export const trackAnalyticsEvent = (
  env: AnalyticsEnv | undefined,
  request: Request,
  input: AnalyticsEventInput,
): void => {
  if (!env?.ANALYTICS) {
    return;
  }
  try {
    env.ANALYTICS.writeDataPoint(buildAnalyticsDataPoint(request, input));
  } catch {
    // Telemetry is best-effort and must never fail a user request.
  }
};

const matchesRequestOrigin = (candidate: string | null, expectedOrigin: string): boolean => {
  if (!candidate) {
    return false;
  }
  try {
    return new URL(candidate).origin === expectedOrigin;
  } catch {
    return false;
  }
};

/**
 * Requires an explicit same-origin signal on `/api/evento`:
 * - Rejects any request with `Sec-Fetch-Site` other than `same-origin` (including `none`, `cross-site`, `same-site`) unless `Sec-Fetch-Site` is absent and `Origin`/`Referer` matches.
 * - Accepts `Sec-Fetch-Site: same-origin` (provided `Origin`, if sent, also matches).
 * - Accepts a matching `Origin` or `Referer` host when `Sec-Fetch-Site` is absent.
 */
export const hasSameOriginSignal = (request: Request): boolean => {
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (fetchSite) {
    if (fetchSite !== "same-origin") {
      return false;
    }
    if (origin && !matchesRequestOrigin(origin, expectedOrigin)) {
      return false;
    }
    return true;
  }

  if (origin) {
    return matchesRequestOrigin(origin, expectedOrigin);
  }
  if (referer) {
    return matchesRequestOrigin(referer, expectedOrigin);
  }
  return false;
};

/**
 * Validates and records a first-party client CTA beacon (`POST /api/evento`).
 * Only allowlisted `CTA_TARGETS`, `KNOWN_PATHS`, and `KNOWN_PLACEMENTS` are stored.
 */
export const handleAnalyticsBeacon = async (
  request: Request,
  env: AnalyticsEnv | undefined,
): Promise<Response> => {
  const headers = { "Cache-Control": "no-store" };

  if (!hasSameOriginSignal(request)) {
    return new Response(null, { headers, status: 403 });
  }

  const bodyResult = await readBoundedUtf8Body(request, BEACON_MAX_BODY_BYTES);
  if (!bodyResult.ok) {
    return new Response(null, {
      headers,
      status: bodyResult.reason === "too_large" ? 413 : 400,
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bodyResult.body);
  } catch {
    return new Response(null, { headers, status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return new Response(null, { headers, status: 400 });
  }

  const record = payload as Record<string, unknown>;
  if (!isCtaTarget(record.target)) {
    return new Response(null, { headers, status: 400 });
  }

  const path = typeof record.path === "string" ? sanitizeAnalyticsPath(record.path) : "other";
  const placement = sanitizeCtaPlacement(record.placement);

  trackAnalyticsEvent(env, request, {
    detail: placement,
    event: "cta_click",
    outcome: record.target,
    path,
    status: 204,
  });

  return new Response(null, { headers, status: 204 });
};
