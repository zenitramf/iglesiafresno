/**
 * Shared church contact and location data.
 * Prefer importing from here instead of hardcoding phone, address, etc.
 */
export const churchInfo = {
  addressLine1: "1717 N Gateway Blvd Ste. #105",
  addressLine2: "Fresno, CA 93727",
  email: "info@iglesiafresno.com",
  facebook: "https://www.facebook.com/fresnovictory/",
  logo: "/vbc_logo.svg",
  /** Cross-platform Maps URL (short goo.gl links break on many mobile browsers). */
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Victory+Baptist+Church%2C+1717+N+Gateway+Blvd+Ste.+105%2C+Fresno%2C+CA+93727",
  name: "Iglesia Bautista Victory",
  /** Display form for UI (e.g. footer, contact links). */
  phone: "559-765-6397",
  /** E.164 form for `<a href="tel:">` and JSON-LD `telephone`. */
  phoneE164: "+15597656397",
  shortName: "IBV",
  /** Dark page background (`--background`) as a hex for `<meta name="theme-color">`. */
  themeColor: "#211e1c",
  /** Canonical public origin. Also drives `astro.config.mjs` `site`. */
  url: "https://iglesiafresno.com",
  youtube: "https://www.youtube.com/@fresnovictory",
} as const;

/** Default site-wide SEO values. Per-page overrides merge on top via `buildSEO()`. */
export const defaultSEO = {
  description:
    "Iglesia Bautista Victory en Fresno, California: una iglesia bautista independiente que proclama el evangelio de Jesucristo por medio del evangelismo personal, la enseñanza de la Biblia y la adoración. Domingos 10:30 a. m. y 5:00 p. m., jueves 7:00 p. m.",
  /** 1200×630 social share image, served from `public/`. */
  ogImage: "/og-default.jpg",
  ogImageAlt:
    "Familia de la congregación de Iglesia Bautista Victory frente al edificio en Fresno",
} as const;

/** Online giving (Tithely) — same link as fresnovictory.com / vbc-website. */
export const giveHref =
  "https://tithe.ly/give_new/www/#/tithely/give-one-time/1285261";
