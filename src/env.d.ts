/**
 * Minimal Worker binding types used by the connection form.
 *
 * This is a hand-written stand-in for `npx wrangler types`
 * (`worker-configuration.d.ts`), which would otherwise commit ~600 KB of
 * generated workerd types. If the generated file is ever added, delete the
 * `cloudflare:workers` declaration below to avoid a duplicate export.
 */

interface ConnectEmailMessage {
  from: string | { email: string; name?: string };
  html?: string;
  replyTo?: string | { email: string; name?: string };
  subject: string;
  text?: string;
  to: string | { email: string; name?: string };
}

interface ConnectEmailBinding {
  send: (message: ConnectEmailMessage) => Promise<{ messageId?: string }>;
}

interface IBVWorkerEnv {
  /** Cloudflare Email Sending binding (see wrangler.jsonc). */
  CONNECT_EMAIL?: ConnectEmailBinding;
  /** Enables the Resend fallback transport. */
  RESEND_API_KEY?: string;
  /** Signs QR entry tokens and gate cookies. */
  QR_CONNECT_SECRET?: string;
}

declare module "cloudflare:workers" {
  export const env: IBVWorkerEnv;
}
