/**
 * Delivers connection-form submissions to the church inbox.
 *
 * Two transports are supported, first one configured wins:
 *
 * 1. Resend HTTP API (`RESEND_API_KEY` secret) — takes precedence the moment
 *    the operator sets it, since a declared `CONNECT_EMAIL` binding can still
 *    lack domain/destination verification at the Cloudflare account.
 * 2. Cloudflare Email Sending binding (`CONNECT_EMAIL` in wrangler.jsonc) —
 *    no API key, restricted to `info@iglesiafresno.com` as destination.
 *
 * See the README ("Formulario de conexión") for the one-time setup.
 */

export interface ConnectSubmission {
  email: string;
  howHeard: string[];
  howHeardOther: string;
  interests: string[];
  interestsOther: string;
  name: string;
  phone: string;
  prayer: string;
  submittedAt: string;
  userAgent: string;
}

export interface ContactSubmission {
  email: string;
  message: string;
  name: string;
  phone: string;
  submittedAt: string;
  userAgent: string;
}

interface SendEmailMessage {
  from: string | { email: string; name?: string };
  html?: string;
  replyTo?: string | { email: string; name?: string };
  subject: string;
  text?: string;
  to: string | { email: string; name?: string };
}

export interface ConnectEmailEnv {
  CONNECT_EMAIL?: {
    send: (message: SendEmailMessage) => Promise<{ messageId?: string }>;
  };
  RESEND_API_KEY?: string;
}

export const CONNECT_EMAIL_TO = "info@iglesiafresno.com";
export const CONNECT_EMAIL_FROM = "sitio-web@iglesiafresno.com";

const FROM_NAME = "Sitio Web IBV — Iglesia Bautista Victory";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatList = (values: string[], other: string): string => {
  const items = [...values];
  if (other) {
    items.push(`Otro: ${other}`);
  }
  return items.length > 0 ? items.join(", ") : "—";
};

/** Highlights which site form produced the submission. */
const htmlCallout = (origin: string): string =>
  `<div style="border:1px solid #e7e5e4;background:#fafaf9;border-radius:8px;padding:10px 14px;margin:0 0 16px"><p style="margin:0;font-size:13px;color:#44403c"><strong>Origen:</strong> ${escapeHtml(origin)}</p></div>`;

const formatSubmittedAt = (isoDate: string): string => {
  try {
    return new Intl.DateTimeFormat("es-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Los_Angeles",
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
};

export interface ConnectEmailContent {
  html: string;
  subject: string;
  text: string;
}

export const buildConnectEmail = (submission: ConnectSubmission): ConnectEmailContent => {
  const howHeard = formatList(submission.howHeard, submission.howHeardOther);
  const interests = formatList(submission.interests, submission.interestsOther);
  const contact = [submission.email, submission.phone].filter(Boolean).join(" · ") || "—";
  const prayer = submission.prayer || "—";
  const receivedAt = formatSubmittedAt(submission.submittedAt);

  const rows: [string, string][] = [
    ["Nombre", submission.name],
    ["Correo electrónico", submission.email || "—"],
    ["Teléfono", submission.phone || "—"],
    ["¿Cómo se enteró de nosotros?", howHeard],
    ["Quiero saber más sobre", interests],
  ];

  const text = [
    "Nueva tarjeta de conexión",
    "",
    "Origen: Tarjeta de conexión (código QR)",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "¿Cómo podemos orar por usted?",
    prayer,
    "",
    `Enviado: ${receivedAt}`,
  ].join("\n");

  const html = [
    htmlCallout("Tarjeta de conexión — código QR del formulario privado"),
    `<h2>Nueva tarjeta de conexión</h2>`,
    `<table cellpadding="6" cellspacing="0" style="border-collapse:collapse">`,
    ...rows.map(
      ([label, value]) =>
        `<tr><td style="vertical-align:top"><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`,
    ),
    `</table>`,
    `<h3>¿Cómo podemos orar por usted?</h3>`,
    `<p style="white-space:pre-wrap">${escapeHtml(prayer)}</p>`,
    `<p style="color:#666;font-size:12px">Enviado: ${escapeHtml(receivedAt)}<br />Contacto: ${escapeHtml(contact)}<br />Navegador: ${escapeHtml(submission.userAgent)}</p>`,
  ].join("\n");

  return {
    html,
    subject: `Nueva conexión: ${submission.name || "Visitante"}`,
    text,
  };
};

/** Plain contact inquiry from the public "Contáctanos" form. */
export const buildContactEmail = (submission: ContactSubmission): ConnectEmailContent => {
  const contact = [submission.email, submission.phone].filter(Boolean).join(" · ") || "—";
  const receivedAt = formatSubmittedAt(submission.submittedAt);

  const text = [
    "Nuevo mensaje de contacto",
    "",
    "Origen: Formulario de contacto (página Planea Tu Visita)",
    "",
    `Nombre: ${submission.name || "—"}`,
    `Correo electrónico: ${submission.email || "—"}`,
    `Teléfono: ${submission.phone || "—"}`,
    "",
    "Mensaje:",
    submission.message || "—",
    "",
    `Enviado: ${receivedAt}`,
  ].join("\n");

  const html = [
    htmlCallout("Formulario de contacto — página «Planea Tu Visita» (/visitanos)"),
    `<h2>Nuevo mensaje de contacto</h2>`,
    `<table cellpadding="6" cellspacing="0" style="border-collapse:collapse">`,
    ...(
      [
        ["Nombre", submission.name],
        ["Correo electrónico", submission.email],
        ["Teléfono", submission.phone],
      ] as [string, string][]
    ).map(
      ([label, value]) =>
        `<tr><td style="vertical-align:top"><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value || "—")}</td></tr>`,
    ),
    `</table>`,
    `<h3>Mensaje</h3>`,
    `<p style="white-space:pre-wrap">${escapeHtml(submission.message || "—")}</p>`,
    `<p style="color:#666;font-size:12px">Enviado: ${escapeHtml(receivedAt)}<br />Contacto: ${escapeHtml(contact)}<br />Navegador: ${escapeHtml(submission.userAgent)}</p>`,
  ].join("\n");

  return {
    html,
    subject: `Nuevo mensaje de contacto: ${submission.name || "Visitante"}`,
    text,
  };
};

export type ConnectEmailTransport = "cloudflare" | "resend";

/** Resend key wins while it is configured; binding is the native fallback. */
const deliver = async (
  env: ConnectEmailEnv,
  content: ConnectEmailContent,
  replyTo: string,
): Promise<ConnectEmailTransport> => {
  const { html, subject, text } = content;

  if (env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from: `${FROM_NAME} <${CONNECT_EMAIL_FROM}>`,
        html,
        reply_to: replyTo,
        subject,
        text,
        to: [CONNECT_EMAIL_TO],
      }),
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Resend request failed (${response.status}): ${await response.text()}`);
    }
    return "resend";
  }

  if (env.CONNECT_EMAIL) {
    await env.CONNECT_EMAIL.send({
      from: { email: CONNECT_EMAIL_FROM, name: FROM_NAME },
      html,
      replyTo,
      subject,
      text,
      to: CONNECT_EMAIL_TO,
    });
    return "cloudflare";
  }

  throw new Error("No email transport configured (RESEND_API_KEY or CONNECT_EMAIL binding)");
};

/**
 * Sends the connection card. Throws when no transport is configured or
 * delivery fails, so the caller can show the visitor a real error state.
 */
export const sendConnectEmail = (
  env: ConnectEmailEnv,
  submission: ConnectSubmission,
): Promise<ConnectEmailTransport> =>
  deliver(env, buildConnectEmail(submission), submission.email || CONNECT_EMAIL_TO);

/** Sends the public contact inquiry with the same delivery guarantees. */
export const sendContactEmail = (
  env: ConnectEmailEnv,
  submission: ContactSubmission,
): Promise<ConnectEmailTransport> =>
  deliver(env, buildContactEmail(submission), submission.email || CONNECT_EMAIL_TO);
