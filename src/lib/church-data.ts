/**
 * Shared church contact and location data.
 * Prefer importing from here instead of hardcoding phone, address, etc.
 */
export const churchInfo = {
  addressLine1: "1717 N Gateway Blvd Ste. #105",
  addressLine2: "Fresno, CA 93727",
  email: "contact@fresnovictory.com",
  /** Display form for UI (e.g. footer, contact links). */
  phone: "559-765-6397",
  /** E.164 form for `<a href="tel:">`. */
  phoneE164: "+15597656397",
} as const;
