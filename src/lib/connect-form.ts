/**
 * Shared connection-form vocabulary: option labels, error codes and the
 * Spanish messages rendered on `/conectar`. Kept in one place so the form page
 * and the `/api/conectar` endpoint can never drift apart.
 */

import { churchInfo } from "@/lib/church-data";

export const HOW_HEARD_OPTIONS = ["Sitio web", "Redes sociales", "Familia", "Amigo"] as const;
export const INTEREST_OPTIONS = ["Salvación", "Bautismo", "Grupos pequeños", "Servir"] as const;

export const ALLOWED_HOW_HEARD_VALUES: ReadonlySet<string> = new Set<string>([
  ...HOW_HEARD_OPTIONS,
  "Otro",
]);
export const ALLOWED_INTEREST_VALUES: ReadonlySet<string> = new Set<string>([
  ...INTEREST_OPTIONS,
  "Otro",
]);

/** Deduplicates values and keeps only entries present in the provided allowlist. */
export const filterAllowedFormOptions = (
  values: readonly string[] | undefined,
  allowlist: ReadonlySet<string>,
): string[] => {
  if (!values || values.length === 0) {
    return [];
  }
  const unique: string[] = [];
  for (const item of values) {
    if (allowlist.has(item) && !unique.includes(item)) {
      unique.push(item);
    }
  }
  return unique;
};

export type BoundedBodyReadResult =
  | { body: string; ok: true }
  | { ok: false; reason: "invalid_encoding" | "too_large" };

/**
 * Streams a UTF-8 request body up to `maxBytes`, cancelling the stream
 * immediately if the byte limit is exceeded or UTF-8 decoding fails.
 */
export const readBoundedUtf8Body = async (
  request: Request,
  maxBytes: number,
): Promise<BoundedBodyReadResult> => {
  if (Number(request.headers.get("content-length")) > maxBytes) {
    await request.body?.cancel();
    return { ok: false, reason: "too_large" };
  }
  const reader = request.body?.getReader();
  if (!reader) {
    return { body: "", ok: true };
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let length = 0;
  let body = "";
  try {
    while (true) {
      // Stream reads must stay sequential to enforce the byte limit.
      // oxlint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      length += value.byteLength;
      if (length > maxBytes) {
        // oxlint-disable-next-line no-await-in-loop
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch {
    return { ok: false, reason: "invalid_encoding" };
  } finally {
    reader.releaseLock();
  }
  return { body, ok: true };
};

// UTF-16 lengths match the browser's native maxlength enforcement.
export const CONNECT_FIELD_LIMITS = {
  nombre: 200,
  correo: 200,
  telefono: 200,
  como_se_entero_otro: 200,
  intereses_otro: 200,
  mensaje: 2000,
  oracion: 2000,
} as const;

// Allows the complete form, including percent-encoded Unicode, without
// buffering arbitrary request bodies in the Worker.
export const CONNECT_MAX_BODY_BYTES = 64 * 1024;

export type ConnectErrorCode =
  | "contacto"
  | "correo"
  | "envio"
  | "mensaje"
  | "nombre"
  | "longitud"
  | "contenido"
  | "formato";

export const CONNECT_ERROR_MESSAGES: Record<ConnectErrorCode, string> = {
  contacto: "Déjanos tu correo electrónico o tu teléfono para poder responder.",
  correo: "Revisa tu correo electrónico: no parece válido.",
  envio: `No pudimos enviar tu información en este momento. Intenta de nuevo en unos minutos o escríbenos a ${churchInfo.email}.`,
  mensaje: "Escribe tu mensaje para que podamos ayudarte.",
  nombre: "Escribe tu nombre para que podamos conocerte.",
  longitud:
    "Revisa la extensión de los campos: los textos largos (petición de oración o mensaje) admiten hasta 2000 caracteres y los demás campos, hasta 200. Conservamos tu información para que puedas corregirla.",
  contenido:
    "El formulario supera el tamaño permitido. Reduce su contenido antes de enviarlo de nuevo.",
  formato: "No pudimos leer el formulario. Envíalo desde esta página sin adjuntar archivos.",
};

const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g;
const EDGE_HYPHENS_PATTERN = /(^-|-$)/g;

/** DOM id for a checkbox generated from its option label. */
export const connectOptionId = (prefix: string, label: string): string =>
  `${prefix}-${label
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_PATTERN, "-")
    .replace(EDGE_HYPHENS_PATTERN, "")}`;
