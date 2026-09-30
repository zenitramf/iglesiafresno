export const prerender = false;

import type { APIRoute } from "astro";

import { CONNECT_PATH } from "@/lib/connect-gate";

// Rewrite before reading the body. The form page handles POSTs so failures
// can render the submitted values without cookies, sessions, or PII in URLs.
export const POST: APIRoute = (context) => context.rewrite(CONNECT_PATH);
