/**
 * Allowlisted analytics dimensions (CTA targets, paths, placements) and the
 * normalizers that map raw values onto them.
 *
 * Shared by the Worker (`analytics.ts`) and the browser click tracker in
 * `base-layout.astro`. Keep this module free of server-only imports so it does
 * not pull Worker code into the client bundle.
 */
import { CONNECT_ENTRY_PREFIX } from "@/lib/connect-gate";

export const CTA_TARGETS = [
  "maps",
  "phone",
  "email",
  "giving",
  "english_site",
  "social_facebook",
  "social_youtube",
  "plan_visit",
  "contact_cta",
  "gospel_cta",
] as const;

export type CtaTarget = (typeof CTA_TARGETS)[number];

export const KNOWN_PATHS = [
  "/",
  "/api/conectar",
  "/atribucion",
  "/conectar",
  "/conectar/gracias",
  "/contacto",
  "/contacto/gracias",
  "/equipo",
  "/evangelio",
  "/nosotros",
  "/privacidad",
  "/qr",
  "/terminos",
  "/visitanos",
] as const;

export type KnownAnalyticsPath = (typeof KNOWN_PATHS)[number] | "other";

/**
 * Landmarks plus the `section[id]` values that exist in the markup. Heroes are
 * marked with `data-hero` (see `page-hero.astro`, `hero-courtyard.astro`).
 */
export const KNOWN_PLACEMENTS = [
  "banner",
  "conectar",
  "contacto",
  "conversemos",
  "footer",
  "header",
  "hero",
  "mobile_menu",
  "nosotros",
  "ofrendas",
  "oracion",
  "oraste-sinceramente",
  "other",
  "page",
  "paso-1",
  "paso-2",
  "paso-3",
  "paso-4",
  "vision",
  "visita",
] as const;

export type CtaPlacement = (typeof KNOWN_PLACEMENTS)[number];

const QUERY_OR_HASH_SPLIT_PATTERN = /[?#]/;
const MULTIPLE_SLASHES_PATTERN = /\/{2,}/g;
const TRAILING_SLASH_PATTERN = /\/+$/;

const ALLOWED_CTA_TARGETS: ReadonlySet<string> = new Set<string>(CTA_TARGETS);
const ALLOWED_PATHS: ReadonlySet<string> = new Set<string>(KNOWN_PATHS);
const ALLOWED_PLACEMENTS: ReadonlySet<string> = new Set<string>(KNOWN_PLACEMENTS);

export const isCtaTarget = (value: unknown): value is CtaTarget =>
  typeof value === "string" && ALLOWED_CTA_TARGETS.has(value);

const isCtaPlacement = (value: string): value is CtaPlacement => ALLOWED_PLACEMENTS.has(value);

const isKnownPath = (value: string): value is KnownAnalyticsPath => ALLOWED_PATHS.has(value);

/** Maps an anchor `href` to a canonical `CtaTarget`, or `null` if it is not tracked. */
export const resolveCtaTargetFromHref = (rawHref: string | null | undefined): CtaTarget | null => {
  const href = rawHref?.trim() ?? "";
  if (!href) {
    return null;
  }
  if (href.startsWith("tel:")) {
    return "phone";
  }
  if (href.startsWith("mailto:")) {
    return "email";
  }
  if (href.includes("google.com/maps") || href.includes("maps.google.com")) {
    return "maps";
  }
  if (href.includes("tithe.ly")) {
    return "giving";
  }
  if (href.includes("fresnovictory.com")) {
    return "english_site";
  }
  if (href.includes("facebook.com")) {
    return "social_facebook";
  }
  if (href.includes("youtube.com")) {
    return "social_youtube";
  }
  if (
    href === "#contacto" ||
    href.endsWith("/visitanos#contacto") ||
    href.endsWith("/visitanos/#contacto")
  ) {
    return "contact_cta";
  }
  if (
    href === "/visitanos" ||
    href === "/visitanos/" ||
    href.startsWith("/visitanos?") ||
    href.startsWith("/visitanos/?")
  ) {
    return "plan_visit";
  }
  if (
    href === "/evangelio" ||
    href === "/evangelio/" ||
    href.startsWith("/evangelio#") ||
    href.startsWith("/evangelio/#")
  ) {
    return "gospel_cta";
  }
  return null;
};

/** Resolves the allowlisted placement from the element's landmark or section. */
export const resolveCtaPlacement = (anchor: Element): CtaPlacement => {
  if (anchor.closest("[data-first-service-banner]")) {
    return "banner";
  }
  if (anchor.closest("#navbar-3-menu")) {
    return "mobile_menu";
  }
  if (anchor.closest("header")) {
    return "header";
  }
  if (anchor.closest("footer")) {
    return "footer";
  }
  if (anchor.closest("[data-hero]")) {
    return "hero";
  }
  const sectionId = anchor.closest("section[id]")?.id;
  if (sectionId && isCtaPlacement(sectionId)) {
    return sectionId;
  }
  return "page";
};

/** Normalizes a placement value against `KNOWN_PLACEMENTS`. */
export const sanitizeCtaPlacement = (value: unknown): CtaPlacement => {
  if (typeof value !== "string") {
    return "other";
  }
  const normalized = value.trim().toLowerCase();
  return isCtaPlacement(normalized) ? normalized : "other";
};

/**
 * Normalizes a URL path against `KNOWN_PATHS`, stripping secret QR entry
 * tokens first (`/qr/<token>` or `/QR/<token>` -> `/qr`). Unknown paths
 * become `"other"`.
 */
export const sanitizeAnalyticsPath = (rawPath: string): KnownAnalyticsPath => {
  const withoutQuery = rawPath.split(QUERY_OR_HASH_SPLIT_PATTERN, 1)[0]?.trim() ?? "";
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const lowercased = withLeadingSlash.replaceAll(MULTIPLE_SLASHES_PATTERN, "/").toLowerCase();

  if (lowercased === "/qr" || lowercased.startsWith(CONNECT_ENTRY_PREFIX)) {
    return "/qr";
  }

  const normalized = lowercased === "/" ? "/" : lowercased.replace(TRAILING_SLASH_PATTERN, "");
  return isKnownPath(normalized) ? normalized : "other";
};
