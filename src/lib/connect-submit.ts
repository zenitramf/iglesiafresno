import type { ConnectEmailEnv, ConnectSubmission, ContactSubmission } from "@/lib/connect-email";
import { sendConnectEmail, sendContactEmail } from "@/lib/connect-email";
import type { ConnectErrorCode } from "@/lib/connect-form";
import {
  CONNECT_FIELD_LIMITS,
  CONNECT_MAX_BODY_BYTES,
  HOW_HEARD_OPTIONS,
  INTEREST_OPTIONS,
} from "@/lib/connect-form";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Native form encoding only; files and other content types aren't accepted. */
const readForm = async (request: Request): Promise<URLSearchParams> => {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded") {
    throw new Error("formato");
  }
  if (Number(request.headers.get("content-length")) > CONNECT_MAX_BODY_BYTES) {
    await request.body?.cancel();
    throw new Error("contenido");
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return new URLSearchParams();
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let length = 0;
  let body = "";
  try {
    while (true) {
      // Stream reads must stay sequential to enforce the byte limit.
      // oxlint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > CONNECT_MAX_BODY_BYTES) {
        // oxlint-disable-next-line no-await-in-loop
        await reader.cancel();
        throw new Error("contenido");
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  // URLSearchParams tolerates broken percent/UTF-8 escapes; reject those
  // instead of silently replacing visitor data with replacement characters.
  decodeURIComponent(body.replaceAll("+", " "));
  return new URLSearchParams(body);
};

/** Delivers a parsed submission, mapping transport failures to `envio`. */
const deliverSubmission = async <T>(
  env: ConnectEmailEnv,
  submission: T,
  send: (env: ConnectEmailEnv, submission: T) => Promise<unknown>,
  parsed: FormParseResult,
): Promise<FormParseResult> => {
  try {
    await send(env, submission);
  } catch {
    // Do not log message content, contact details, or provider error text.
    // oxlint-disable-next-line no-console
    console.error("[formularios] Falló la entrega del correo");
    return { honeypot: false, values: parsed.values, errorCode: "envio", status: 502 };
  }
  return { honeypot: false, values: parsed.values, errorCode: null, status: 303 };
};

export interface FormParseResult {
  values: URLSearchParams;
  errorCode: ConnectErrorCode | null;
  /** Honeypot hit — pretend success without delivering anything. */
  honeypot: boolean;
  status: number;
}

/**
 * Reads, bounds and validates the shared form core: honeypot, field limits,
 * name, and at least one contact channel. Form-specific fields (message,
 * checkboxes) are layered on top by each form's pipeline.
 */
const parseForm = async (
  request: Request,
  { requireMessage }: { requireMessage: boolean },
): Promise<FormParseResult> => {
  let values: URLSearchParams;
  try {
    values = await readForm(request);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "contenido";
    const unsupported =
      request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
      "application/x-www-form-urlencoded";
    return {
      honeypot: false,
      values: new URLSearchParams(),
      errorCode: tooLarge ? "contenido" : "formato",
      status: tooLarge ? 413 : unsupported ? 415 : 400,
    };
  }

  const fail = (errorCode: ConnectErrorCode, status = 422): FormParseResult => ({
    honeypot: false,
    values,
    errorCode,
    status,
  });
  const text = (field: string): string => values.get(field) ?? "";

  // Honeypot: no email, but the same confirmation as a successful submission.
  if (text("sitio_web").trim()) {
    return { honeypot: true, values, errorCode: null, status: 303 };
  }
  for (const [field, limit] of Object.entries(CONNECT_FIELD_LIMITS)) {
    if (values.getAll(field).some((value) => value.length > limit)) {
      return fail("longitud");
    }
  }
  if (!text("nombre").trim()) return fail("nombre");
  if (!text("correo").trim() && !text("telefono").trim()) return fail("contacto");
  if (text("correo") && !EMAIL_PATTERN.test(text("correo"))) return fail("correo");
  if (requireMessage && !text("mensaje").trim()) return fail("mensaje");
  return { honeypot: false, values, errorCode: null, status: 303 };
};

/** Returns the original values on every readable failure; never stores PII. */
export const submitConnectForm = async (
  request: Request,
  env: ConnectEmailEnv,
): Promise<FormParseResult> => {
  const parsed = await parseForm(request, { requireMessage: false });
  if (parsed.errorCode || parsed.honeypot) {
    return parsed;
  }

  const text = (field: string): string => parsed.values.get(field) ?? "";
  const submission: ConnectSubmission = {
    name: text("nombre"),
    email: text("correo"),
    phone: text("telefono"),
    howHeard: [...new Set(parsed.values.getAll("como_se_entero"))].filter((value) =>
      [...HOW_HEARD_OPTIONS, "Otro"].some((option) => option === value),
    ),
    howHeardOther: text("como_se_entero_otro"),
    interests: [...new Set(parsed.values.getAll("intereses"))].filter((value) =>
      [...INTEREST_OPTIONS, "Otro"].some((option) => option === value),
    ),
    interestsOther: text("intereses_otro"),
    prayer: text("oracion"),
    submittedAt: new Date().toISOString(),
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 300),
  };
  return deliverSubmission(env, submission, sendConnectEmail, parsed);
};

/** Public "Contáctanos" form on /visitanos: name, contact channel, message. */
export const submitContactForm = async (
  request: Request,
  env: ConnectEmailEnv,
): Promise<FormParseResult> => {
  const parsed = await parseForm(request, { requireMessage: true });
  if (parsed.errorCode || parsed.honeypot) {
    return parsed;
  }

  const text = (field: string): string => parsed.values.get(field) ?? "";
  const submission: ContactSubmission = {
    name: text("nombre"),
    email: text("correo"),
    phone: text("telefono"),
    message: text("mensaje"),
    submittedAt: new Date().toISOString(),
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 300),
  };
  return deliverSubmission(env, submission, sendContactEmail, parsed);
};
