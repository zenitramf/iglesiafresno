export const prerender = false;

import type { APIRoute } from "astro";

import { handleAnalyticsBeacon } from "@/lib/analytics";

export const POST: APIRoute = async ({ request }) => {
  const { env } = await import("cloudflare:workers");
  return handleAnalyticsBeacon(request, env);
};
