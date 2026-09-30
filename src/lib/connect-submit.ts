import type { ConnectEmailEnv, ConnectSubmission } from "@/lib/connect-email";
import { sendConnectEmail } from "@/lib/connect-email";
import type { ConnectErrorCode } from "@/lib/connect-form";
import {
  CONNECT_FIELD_LIMITS,
  CONNECT_MAX_BODY_BYTES,
  HOW_HEARD_OPTIONS,
  INTEREST_OPTIONS,
} from "@/lib/connect-form";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ConnectSubmitResult {
  values: URLSearchParams;
  errorCode: ConnectErrorCode | null;
  status: number;
}

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

/** Returns the original values on every readable failure; never stores PII. */
export const submitConnectForm = async (
  request: Request,
  env: ConnectEmailEnv,
): Promise<ConnectSubmitResult> => {
  let values: URLSearchParams;
  try {
    values = await readForm(request);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "contenido";
    const unsupported =
      request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
      "application/x-www-form-urlencoded";
    return {
      values: new URLSearchParams(),
      errorCode: tooLarge ? "contenido" : "formato",
      status: tooLarge ? 413 : unsupported ? 415 : 400,
    };
  }

  const fail = (errorCode: ConnectErrorCode, status = 422): ConnectSubmitResult => ({
    values,
    errorCode,
    status,
  });
  const text = (field: string): string => values.get(field) ?? "";

  // Honeypot: no email, but the same confirmation as a successful submission.
  if (text("sitio_web").trim()) {
    return { values, errorCode: null, status: 303 };
  }
  for (const [field, limit] of Object.entries(CONNECT_FIELD_LIMITS)) {
    if (values.getAll(field).some((value) => value.length > limit)) {
      return fail("longitud");
    }
  }
  if (!text("nombre").trim()) return fail("nombre");
  if (!text("correo").trim() && !text("telefono").trim()) return fail("contacto");
  if (text("correo") && !EMAIL_PATTERN.test(text("correo"))) return fail("correo");

  const submission: ConnectSubmission = {
    name: text("nombre"),
    email: text("correo"),
    phone: text("telefono"),
    howHeard: [...new Set(values.getAll("como_se_entero"))].filter((value) =>
      HOW_HEARD_OPTIONS.some((option) => option === value),
    ),
    howHeardOther: text("como_se_entero_otro"),
    interests: [...new Set(values.getAll("intereses"))].filter((value) =>
      INTEREST_OPTIONS.some((option) => option === value),
    ),
    interestsOther: text("intereses_otro"),
    prayer: text("oracion"),
    submittedAt: new Date().toISOString(),
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 300),
  };
  try {
    await sendConnectEmail(env, submission);
  } catch {
    // Do not log the prayer request, contact details, or provider error text.
    // oxlint-disable-next-line no-console
    console.error("[conectar] Falló la entrega del correo de conexión");
    return fail("envio", 502);
  }
  return { values, errorCode: null, status: 303 };
};
