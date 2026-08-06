/**
 * Service times from the Victory Baptist Church API.
 * Spanish ministry schedule uses the `spanish` field.
 * @see https://fresnovictory.com/api/service-times.json
 */

const SERVICE_TIMES_URL = "https://fresnovictory.com/api/service-times.json";

const TIME_PATTERN = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i;

export interface ServiceTimeEntry {
  day: string;
  id: string;
  label: string;
  time: string;
  translationAvailable?: boolean;
}

export interface ServiceTimesResponse {
  church: {
    name: string;
    shortName: string;
    url: string;
  };
  services: ServiceTimeEntry[];
  spanish: ServiceTimeEntry[];
  timezone: string;
}

/** Display row for the Spanish site UI. */
export interface DisplayServiceTime {
  label: string;
  time: string;
}

const DAY_ES: Record<string, string> = {
  Friday: "viernes",
  Monday: "lunes",
  Saturday: "sábado",
  Sunday: "domingo",
  Thursday: "jueves",
  Tuesday: "martes",
  Wednesday: "miércoles",
};

/** Spanish labels keyed by API service id. */
const LABEL_ES: Record<string, string> = {
  bibleStudy: "Estudio bíblico",
  spanishService: "Servicio en español",
  sundayMorning: "Culto de la mañana",
  sundayNight: "Culto de la tarde",
  sundaySchool: "Escuela Dominical",
};

/**
 * Format API times like "10:30am" / "5pm" for Spanish display.
 * Examples: "10:30 a. m.", "5:00 p. m."
 */
export function formatTimeEs(time: string): string {
  const match = time.trim().match(TIME_PATTERN);
  if (!match) {
    return time;
  }

  const [, hour, rawMinutes, rawPeriod] = match;
  const minutes = rawMinutes ?? "00";
  const period = rawPeriod.toLowerCase() === "am" ? "a. m." : "p. m.";
  return `${hour}:${minutes} ${period}`;
}

function labelForEntry(entry: ServiceTimeEntry): string {
  let label = LABEL_ES[entry.id] ?? entry.label;

  if (entry.translationAvailable) {
    label = `${label} (con traducción)`;
  }

  const dayEs = DAY_ES[entry.day];
  // Sundays are implied for most services; show weekday when not Sunday.
  if (dayEs && entry.day !== "Sunday") {
    label = `${label} (${dayEs})`;
  }

  return label;
}

function toDisplay(entry: ServiceTimeEntry): DisplayServiceTime {
  return {
    label: labelForEntry(entry),
    time: formatTimeEs(entry.time),
  };
}

let spanishServiceTimesPromise: Promise<DisplayServiceTime[]> | undefined;

async function fetchSpanishServiceTimes(): Promise<DisplayServiceTime[]> {
  try {
    const response = await fetch(SERVICE_TIMES_URL);
    if (!response.ok) {
      throw new Error(
        `Service times API returned ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as ServiceTimesResponse;
    if (!Array.isArray(data.spanish)) {
      throw new Error("Service times API missing `spanish` array");
    }

    return data.spanish.map(toDisplay);
  } catch (error) {
    console.error("Failed to load service times:", error);
    return [];
  }
}

/**
 * Fetch Spanish ministry service times from the public API.
 * Result is cached per process (dedupes multiple components on one page).
 * Falls back to an empty list if the request fails (build-safe).
 */
export function getSpanishServiceTimes(): Promise<DisplayServiceTime[]> {
  spanishServiceTimesPromise ??= fetchSpanishServiceTimes();
  return spanishServiceTimesPromise;
}
