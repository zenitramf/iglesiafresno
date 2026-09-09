/**
 * Shared church contact and location data.
 * Prefer importing from here instead of hardcoding phone, address, etc.
 */
export const churchInfo = {
  addressLine1: "1717 N Gateway Blvd Ste. #105",
  addressLine2: "Fresno, CA 93727",
  email: "info@iglesiafresno.com",
  /** Cross-platform Maps URL (short goo.gl links break on many mobile browsers). */
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Victory+Baptist+Church%2C+1717+N+Gateway+Blvd+Ste.+105%2C+Fresno%2C+CA+93727",
  /** Display form for UI (e.g. footer, contact links). */
  phone: "559-765-6397",
  /** E.164 form for `<a href="tel:">`. */
  phoneE164: "+15597656397",
} as const;

/** Online giving (Tithely) — same link as fresnovictory.com / vbc-website. */
export const giveHref =
  "https://tithe.ly/give_new/www/#/tithely/give-one-time/1285261";
