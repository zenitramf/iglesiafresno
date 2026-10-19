import type { AnalyticsEnv, AnalyticsEventName } from "@/lib/analytics";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type {
  ConnectEmailEnv,
  ConnectEmailTransport,
  ConnectSubmission,
  ContactSubmission,
} from "@/lib/connect-email";
import { sendConnectEmail, sendContactEmail } from "@/lib/connect-email";
import type { ConnectErrorCode } from "@/lib/connect-form";
import {
  ALLOWED_HOW_HEARD_VALUES,
  ALLOWED_INTEREST_VALUES,
  CONNECT_FIELD_LIMITS,
  CONNECT_MAX_BODY_BYTES,
  filterAllowedFormOptions,
  readBoundedUtf8Body,
} from "@/lib/connect-form";

export type ConnectSubmitEnv = ConnectEmailEnv & AnalyticsEnv;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormBodyReadResult =
  | { ok: true; values: URLSearchParams }
  | { errorCode: "contenido" | "formato"; ok: false; status: 400 | 413 | 415 };

/** Native form encoding only; files and other content types aren't accepted. */
const readForm = async (request: Request): Promise<FormBodyReadResult> => {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded") {
    return { errorCode: "formato", ok: false, status: 415 };
  }

  const bodyResult = await readBoundedUtf8Body(request, CONNECT_MAX_BODY_BYTES);
  if (!bodyResult.ok) {
    if (bodyResult.reason === "too_large") {
      return { errorCode: "contenido", ok: false, status: 413 };
    }
    return { errorCode: "formato", ok: false, status: 400 };
  }

  // URLSearchParams tolerates broken percent/UTF-8 escapes; reject those
  // instead of silently replacing visitor data with replacement characters.
  try {
    decodeURIComponent(bodyResult.body.replaceAll("+", " "));
  } catch {
    return { errorCode: "formato", ok: false, status: 400 };
  }

  return { ok: true, values: new URLSearchParams(bodyResult.body) };
};

/** Delivers a parsed submission, mapping transport failures to `envio`. */
const deliverSubmission = async <T>(
  env: ConnectEmailEnv,
  submission: T,
  send: (env: ConnectEmailEnv, submission: T) => Promise<ConnectEmailTransport>,
  parsed: FormParseResult,
): Promise<FormParseResult> => {
  let transport: ConnectEmailTransport;
  try {
    transport = await send(env, submission);
  } catch {
    // Do not log message content, contact details, or provider error text.
    // oxlint-disable-next-line no-console
    console.error("[formularios] Falló la entrega del correo");
    return { honeypot: false, values: parsed.values, errorCode: "envio", status: 502 };
  }
  return {
    honeypot: false,
    transport,
    values: parsed.values,
    errorCode: null,
    status: 303,
  };
};

export interface FormParseResult {
  values: URLSearchParams;
  errorCode: ConnectErrorCode | null;
  /** Honeypot hit — pretend success without delivering anything. */
  honeypot: boolean;
  status: number;
  transport?: ConnectEmailTransport;
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
  const readResult = await readForm(request);
  if (!readResult.ok) {
    return {
      honeypot: false,
      values: new URLSearchParams(),
      errorCode: readResult.errorCode,
      status: readResult.status,
    };
  }
  const { values } = readResult;

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

/**
 * Shared validation + early-return analytics tracker for both forms.
 * Records `honeypot` (detail: `sitio_web`) or `validation_error` (detail: errorCode)
 * when a submission does not proceed to email delivery.
 */
const parseAndTrackForm = async (
  request: Request,
  env: ConnectSubmitEnv,
  options: {
    event: Extract<AnalyticsEventName, "connect_submit" | "contact_submit">;
    path: "/conectar" | "/contacto";
    requireMessage: boolean;
  },
): Promise<FormParseResult> => {
  const parsed = await parseForm(request, { requireMessage: options.requireMessage });
  if (parsed.honeypot) {
    trackAnalyticsEvent(env, request, {
      detail: "sitio_web",
      event: options.event,
      outcome: "honeypot",
      path: options.path,
      status: parsed.status,
    });
  } else if (parsed.errorCode) {
    trackAnalyticsEvent(env, request, {
      detail: parsed.errorCode,
      event: options.event,
      outcome: "validation_error",
      path: options.path,
      status: parsed.status,
    });
  }
  return parsed;
};

/** Returns the original values on every readable failure; never stores PII. */
export const submitConnectForm = async (
  request: Request,
  env: ConnectSubmitEnv,
): Promise<FormParseResult> => {
  const parsed = await parseAndTrackForm(request, env, {
    event: "connect_submit",
    path: "/conectar",
    requireMessage: false,
  });
  if (parsed.errorCode || parsed.honeypot) {
    return parsed;
  }

  const text = (field: string): string => parsed.values.get(field) ?? "";
  const submission: ConnectSubmission = {
    name: text("nombre"),
    email: text("correo"),
    phone: text("telefono"),
    howHeard: filterAllowedFormOptions(
      parsed.values.getAll("como_se_entero"),
      ALLOWED_HOW_HEARD_VALUES,
    ),
    howHeardOther: text("como_se_entero_otro"),
    interests: filterAllowedFormOptions(parsed.values.getAll("intereses"), ALLOWED_INTEREST_VALUES),
    interestsOther: text("intereses_otro"),
    prayer: text("oracion"),
    submittedAt: new Date().toISOString(),
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 300),
  };
  const delivered = await deliverSubmission(env, submission, sendConnectEmail, parsed);
  trackAnalyticsEvent(env, request, {
    detail: delivered.errorCode ?? delivered.transport ?? "unknown",
    event: "connect_submit",
    hasPrayer: Boolean(submission.prayer.trim()),
    howHeard: submission.howHeard,
    interests: submission.interests,
    outcome: delivered.errorCode ? "delivery_error" : "success",
    path: "/conectar",
    status: delivered.status,
  });
  return delivered;
};

/** Public "Contáctanos" form on /visitanos: name, contact channel, message. */
export const submitContactForm = async (
  request: Request,
  env: ConnectSubmitEnv,
): Promise<FormParseResult> => {
  const parsed = await parseAndTrackForm(request, env, {
    event: "contact_submit",
    path: "/contacto",
    requireMessage: true,
  });
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
  const delivered = await deliverSubmission(env, submission, sendContactEmail, parsed);
  trackAnalyticsEvent(env, request, {
    detail: delivered.errorCode ?? delivered.transport ?? "unknown",
    event: "contact_submit",
    outcome: delivered.errorCode ? "delivery_error" : "success",
    path: "/contacto",
    status: delivered.status,
  });
  return delivered;
};
