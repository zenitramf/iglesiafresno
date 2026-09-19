/**
 * First Spanish service announcement (4 Oct 2026, 5:00 p. m.).
 * Visible through that calendar day in America/Los_Angeles; hidden after.
 */

export const FIRST_SERVICE_BANNER = {
  href: "/visitanos",
  lastVisibleDate: "2026-10-04",
  timeZone: "America/Los_Angeles",
} as const;

/** `YYYY-MM-DD` for `date` in `timeZone`. */
export function calendarDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    }).formatToParts(date),
    year = parts.find((part) => part.type === "year")?.value,
    month = parts.find((part) => part.type === "month")?.value,
    day = parts.find((part) => part.type === "day")?.value;

  if (!(year && month && day)) {
    throw new Error("Could not format calendar date in timezone");
  }

  return `${year}-${month}-${day}`;
}

export function isFirstServiceBannerVisible(now: Date = new Date()): boolean {
  const today = calendarDateInTimeZone(now, FIRST_SERVICE_BANNER.timeZone);
  return today <= FIRST_SERVICE_BANNER.lastVisibleDate;
}
