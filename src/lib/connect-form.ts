/**
 * Shared connection-form vocabulary: option labels, error codes and the
 * Spanish messages rendered on `/conectar`. Kept in one place so the form page
 * and the `/api/conectar` endpoint can never drift apart.
 */

import { churchInfo } from "@/lib/church-data";

export const HOW_HEARD_OPTIONS = ["Sitio web", "Redes sociales", "Familia", "Amigo"] as const;
export const INTEREST_OPTIONS = ["Salvación", "Bautismo", "Grupos pequeños", "Servir"] as const;

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

/** DOM id for a checkbox generated from its option label. */
export const connectOptionId = (prefix: string, label: string): string =>
  `${prefix}-${label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
