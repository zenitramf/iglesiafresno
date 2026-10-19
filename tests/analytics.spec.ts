import { expect, test } from "@playwright/test";

import type { AnalyticsDataPoint } from "../src/lib/analytics";
import {
  BEACON_MAX_BODY_BYTES,
  buildAnalyticsDataPoint,
  detectCountry,
  detectDeviceCategory,
  handleAnalyticsBeacon,
} from "../src/lib/analytics";
import {
  resolveCtaTargetFromHref,
  sanitizeAnalyticsPath,
  sanitizeCtaPlacement,
} from "../src/lib/analytics-dimensions";
import { buildConnectCookieValue, deriveConnectEntryToken } from "../src/lib/connect-gate";
import { evaluateConnectGate } from "../src/lib/connect-gate-decision";
import { submitConnectForm, submitContactForm } from "../src/lib/connect-submit";
import { gotoReady } from "./ready";

test.describe("Cloudflare Analytics Engine unit helpers", () => {
  test("strips secret QR tokens case-insensitively and allowlists known paths", () => {
    expect(sanitizeAnalyticsPath("/qr/super-secret-hmac-token")).toBe("/qr");
    expect(sanitizeAnalyticsPath("/QR/SUPER-SECRET-TOKEN")).toBe("/qr");
    expect(sanitizeAnalyticsPath("/Qr/MixedCaseToken")).toBe("/qr");
    expect(sanitizeAnalyticsPath("/qr/")).toBe("/qr");
    expect(sanitizeAnalyticsPath("/visitanos/?utm=test#contacto")).toBe("/visitanos");
    expect(sanitizeAnalyticsPath("/")).toBe("/");
    expect(sanitizeAnalyticsPath("/ruta-inventada-123")).toBe("other");
  });

  test("allowlists known placements and falls back to other", () => {
    expect(sanitizeCtaPlacement("header")).toBe("header");
    expect(sanitizeCtaPlacement("VISITA")).toBe("visita");
    expect(sanitizeCtaPlacement("arbitrary_custom_placement")).toBe("other");
    expect(sanitizeCtaPlacement(undefined)).toBe("other");
  });

  test("maps anchor hrefs from a single source of truth", () => {
    expect(resolveCtaTargetFromHref("tel:+15597656397")).toBe("phone");
    expect(resolveCtaTargetFromHref("mailto:info@iglesiafresno.com")).toBe("email");
    expect(resolveCtaTargetFromHref("https://www.google.com/maps/search/?api=1")).toBe("maps");
    expect(resolveCtaTargetFromHref("https://tithe.ly/give_new/www")).toBe("giving");
    expect(resolveCtaTargetFromHref("https://fresnovictory.com")).toBe("english_site");
    expect(resolveCtaTargetFromHref("/visitanos")).toBe("plan_visit");
    expect(resolveCtaTargetFromHref("#contacto")).toBe("contact_cta");
    expect(resolveCtaTargetFromHref("/evangelio")).toBe("gospel_cta");
    expect(resolveCtaTargetFromHref("/nosotros")).toBeNull();
  });

  test("buckets device and country from headers without storing raw user-agent", () => {
    const mobileReq = new Request("https://iglesiafresno.com/visitanos", {
      headers: {
        "cf-ipcountry": "us",
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      },
    });
    expect(detectCountry(mobileReq)).toBe("US");
    expect(detectDeviceCategory(mobileReq)).toBe("mobile");

    const botReq = new Request("https://iglesiafresno.com/", {
      headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
    });
    expect(detectCountry(botReq)).toBe("XX");
    expect(detectDeviceCategory(botReq)).toBe("bot");
  });

  test("records qr_scan, gate_blocked, and page-only gate_view in middleware", async () => {
    const events: AnalyticsDataPoint[] = [];
    const secret = "unit-test-qr-connect-secret-value";
    const env = {
      ANALYTICS: {
        writeDataPoint: (point?: AnalyticsDataPoint) => {
          if (point) {
            events.push(point);
          }
        },
      },
      QR_CONNECT_SECRET: secret,
    };

    const validToken = await deriveConnectEntryToken(secret);
    const validCookie = await buildConnectCookieValue(secret);

    // 1. Valid QR scan
    const validScan = await evaluateConnectGate(
      new Request(`https://iglesiafresno.com/qr/${validToken}`),
      undefined,
      env,
    );
    expect(validScan).toMatchObject({
      action: "redirect",
      location: "/conectar",
      status: 302,
    });

    // 2. Invalid QR scan (token never reaches analytics; path is recorded as /qr)
    const invalidScan = await evaluateConnectGate(
      new Request("https://iglesiafresno.com/qr/bad-secret-token"),
      undefined,
      env,
    );
    expect(invalidScan).toEqual({
      action: "redirect",
      location: "/visitanos",
      status: 302,
    });

    // 3. Gate blocked (missing cookie)
    const missingCookie = await evaluateConnectGate(
      new Request("https://iglesiafresno.com/conectar"),
      undefined,
      env,
    );
    expect(missingCookie).toEqual({
      action: "redirect",
      location: "/visitanos",
      status: 302,
    });

    // 4. Gate blocked (invalid/expired cookie)
    const invalidCookie = await evaluateConnectGate(
      new Request("https://iglesiafresno.com/conectar/gracias"),
      "100.invalid-signature",
      env,
    );
    expect(invalidCookie).toEqual({
      action: "redirect",
      location: "/visitanos",
      status: 302,
    });

    // 5. Authorized GET on /conectar and /conectar/gracias -> emits gate_view
    const viewConectar = await evaluateConnectGate(
      new Request("https://iglesiafresno.com/conectar"),
      validCookie,
      env,
    );
    expect(viewConectar).toEqual({ action: "next" });

    const viewGracias = await evaluateConnectGate(
      new Request("https://iglesiafresno.com/conectar/gracias"),
      validCookie,
      env,
    );
    expect(viewGracias).toEqual({ action: "next" });

    // 6. Authorized GET on /api/conectar and POST on /conectar -> must NOT emit gate_view
    await evaluateConnectGate(
      new Request("https://iglesiafresno.com/api/conectar", { method: "GET" }),
      validCookie,
      env,
    );
    await evaluateConnectGate(
      new Request("https://iglesiafresno.com/conectar", { method: "POST" }),
      validCookie,
      env,
    );

    expect(events.map((point) => point.blobs.slice(0, 4))).toEqual([
      ["qr_scan", "valid", "/qr", "cookie_issued"],
      ["qr_scan", "invalid", "/qr", "invalid_token"],
      ["gate_blocked", "redirect_visitanos", "/conectar", "missing_cookie"],
      ["gate_blocked", "redirect_visitanos", "/conectar/gracias", "invalid_or_expired_cookie"],
      ["gate_view", "authorized", "/conectar", "cookie_valid"],
      ["gate_view", "authorized", "/conectar/gracias", "cookie_valid"],
    ]);
  });

  test("records only allowlisted categories and boolean prayer flag on /conectar", async () => {
    const events: AnalyticsDataPoint[] = [];
    const request = new Request("https://iglesiafresno.com/api/conectar", {
      body: new URLSearchParams({
        como_se_entero: "Familia",
        como_se_entero_otro: "Dato privado que no debe ir a analítica",
        correo: "ana@example.com",
        intereses: "Salvación",
        intereses_otro: "Otro texto libre privado",
        nombre: "Ana Pérez",
        oracion: "Oren por mi salud personal.",
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "cf-ipcountry": "US",
        "sec-ch-ua-mobile": "?1",
      },
      method: "POST",
    });

    const result = await submitConnectForm(request, {
      ANALYTICS: {
        writeDataPoint: (point) => {
          if (point) {
            events.push(point);
          }
        },
      },
      CONNECT_EMAIL: {
        send: async () => ({ messageId: "msg-1" }),
      },
    });

    expect(result.status).toBe(303);
    expect(events).toHaveLength(1);
    const [point] = events;
    expect(point.indexes).toEqual(["connect_submit"]);
    expect(point.blobs).toEqual([
      "connect_submit",
      "success",
      "/conectar",
      "cloudflare",
      "US",
      "mobile",
      "Familia",
      "Salvación",
    ]);
    expect(point.doubles).toEqual([1, 303, 1, 1, 1]);

    const serialized = JSON.stringify(point);
    expect(serialized).not.toContain("Ana Pérez");
    expect(serialized).not.toContain("ana@example.com");
    expect(serialized).not.toContain("salud personal");
    expect(serialized).not.toContain("Dato privado");
  });

  test("records validation_error, delivery_error, and honeypot outcomes", async () => {
    const events: AnalyticsDataPoint[] = [];
    const analyticsEnv = {
      writeDataPoint: (point?: AnalyticsDataPoint) => {
        if (point) {
          events.push(point);
        }
      },
    };

    await submitContactForm(
      new Request("https://iglesiafresno.com/contacto", {
        body: new URLSearchParams({ nombre: "María", mensaje: "Hola" }),
        method: "POST",
      }),
      { ANALYTICS: analyticsEnv },
    );

    await submitContactForm(
      new Request("https://iglesiafresno.com/contacto", {
        body: new URLSearchParams({
          correo: "maria@example.com",
          mensaje: "Hola",
          nombre: "María",
        }),
        method: "POST",
      }),
      {
        ANALYTICS: analyticsEnv,
        CONNECT_EMAIL: {
          send: async () => {
            throw new Error("boom");
          },
        },
      },
    );

    await submitContactForm(
      new Request("https://iglesiafresno.com/contacto", {
        body: new URLSearchParams({
          mensaje: "Spam",
          nombre: "Bot",
          sitio_web: "https://spam.example",
        }),
        method: "POST",
      }),
      { ANALYTICS: analyticsEnv },
    );

    expect(
      events.map((event) => [event.blobs[0], event.blobs[1], event.blobs[3], event.doubles[1]]),
    ).toEqual([
      ["contact_submit", "validation_error", "contacto", 422],
      ["contact_submit", "delivery_error", "envio", 502],
      ["contact_submit", "honeypot", "sitio_web", 303],
    ]);
  });

  test("enforces same-origin signals, allowlists, and size limits on /api/evento", async () => {
    const events: AnalyticsDataPoint[] = [];
    const env = {
      ANALYTICS: {
        writeDataPoint: (point?: AnalyticsDataPoint) => {
          if (point) {
            events.push(point);
          }
        },
      },
    };

    const okSameOrigin = await handleAnalyticsBeacon(
      new Request("https://iglesiafresno.com/api/evento", {
        body: JSON.stringify({
          path: "/visitanos",
          placement: "visitanos_custom",
          target: "maps",
        }),
        headers: { "sec-fetch-site": "same-origin" },
        method: "POST",
      }),
      env,
    );
    expect(okSameOrigin.status).toBe(204);
    expect(events).toHaveLength(1);
    expect(events[0]?.blobs.slice(0, 4)).toEqual(["cta_click", "maps", "/visitanos", "other"]);

    const okOriginHeader = await handleAnalyticsBeacon(
      new Request("https://iglesiafresno.com/api/evento", {
        body: JSON.stringify({
          path: "/unknown-page",
          placement: "header",
          target: "giving",
        }),
        headers: { Origin: "https://iglesiafresno.com" },
        method: "POST",
      }),
      env,
    );
    expect(okOriginHeader.status).toBe(204);
    expect(events).toHaveLength(2);
    expect(events[1]?.blobs.slice(0, 4)).toEqual(["cta_click", "giving", "other", "header"]);

    // Missing Sec-Fetch-Site AND missing Origin/Referer (e.g. plain curl) -> 403
    const noOriginSignal = await handleAnalyticsBeacon(
      new Request("https://iglesiafresno.com/api/evento", {
        body: JSON.stringify({ path: "/", placement: "header", target: "maps" }),
        method: "POST",
      }),
      env,
    );
    expect(noOriginSignal.status).toBe(403);

    // Sec-Fetch-Site: none -> 403
    const fetchSiteNone = await handleAnalyticsBeacon(
      new Request("https://iglesiafresno.com/api/evento", {
        body: JSON.stringify({ path: "/", placement: "header", target: "maps" }),
        headers: { "sec-fetch-site": "none" },
        method: "POST",
      }),
      env,
    );
    expect(fetchSiteNone.status).toBe(403);

    // Cross-site -> 403
    const crossSite = await handleAnalyticsBeacon(
      new Request("https://iglesiafresno.com/api/evento", {
        body: JSON.stringify({ path: "/", placement: "header", target: "maps" }),
        headers: { "sec-fetch-site": "cross-site" },
        method: "POST",
      }),
      env,
    );
    expect(crossSite.status).toBe(403);

    // Invalid target -> 400
    const invalidTarget = await handleAnalyticsBeacon(
      new Request("https://iglesiafresno.com/api/evento", {
        body: JSON.stringify({ path: "/", placement: "header", target: "arbitrary_event" }),
        headers: { "sec-fetch-site": "same-origin" },
        method: "POST",
      }),
      env,
    );
    expect(invalidTarget.status).toBe(400);

    // Oversized body -> 413
    const oversized = await handleAnalyticsBeacon(
      new Request("https://iglesiafresno.com/api/evento", {
        body: "x".repeat(BEACON_MAX_BODY_BYTES + 10),
        headers: { "sec-fetch-site": "same-origin" },
        method: "POST",
      }),
      env,
    );
    expect(oversized.status).toBe(413);

    // Case-insensitive QR token strip in buildAnalyticsDataPoint
    const directPoint = buildAnalyticsDataPoint(
      new Request("https://iglesiafresno.com/QR/SECRET-TOKEN-VALUE"),
      {
        detail: "cookie_issued",
        event: "qr_scan",
        outcome: "valid",
        path: "/QR/SECRET-TOKEN-VALUE",
        status: 302,
      },
    );
    expect(directPoint.blobs[2]).toBe("/qr");
  });
});

test.describe("E2E beacon endpoint and client click tracking", () => {
  test("POST /api/evento requires same-origin and rejects unauthenticated or GET requests", async ({
    baseURL,
    request,
  }) => {
    const postResponse = await request.post("/api/evento", {
      data: JSON.stringify({
        path: "/visitanos",
        placement: "header",
        target: "plan_visit",
      }),
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        Origin: baseURL as string,
      },
    });
    expect(postResponse.status()).toBe(204);
    expect(postResponse.headers()["cache-control"]).toBe("no-store");

    const forgedResponse = await request.post("/api/evento", {
      data: JSON.stringify({
        path: "/visitanos",
        placement: "header",
        target: "plan_visit",
      }),
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
    });
    expect(forgedResponse.status()).toBe(403);

    const getResponse = await request.get("/api/evento");
    expect(getResponse.status()).toBe(404);
  });

  test("primary click and middle-click dispatch beacons while preventDefault suppresses them", async ({
    page,
  }) => {
    await gotoReady(page, "/visitanos");

    // 1. Primary click on Contáctanos CTA
    const clickBeaconPromise = page.waitForRequest(
      (req) => req.url().endsWith("/api/evento") && req.method() === "POST",
    );
    await page.getByRole("link", { name: "Contáctanos" }).first().click();
    const clickBeaconReq = await clickBeaconPromise;
    expect(JSON.parse(clickBeaconReq.postData() ?? "{}")).toEqual({
      path: "/visitanos",
      placement: "page",
      target: "contact_cta",
    });

    // 2. Middle-click (auxclick button 1) on Google Maps CTA
    const auxBeaconPromise = page.waitForRequest(
      (req) => req.url().endsWith("/api/evento") && req.method() === "POST",
    );
    await page
      .getByRole("link", { name: "Abrir en Google Maps" })
      .dispatchEvent("auxclick", { bubbles: true, button: 1 });
    const auxBeaconReq = await auxBeaconPromise;
    expect(JSON.parse(auxBeaconReq.postData() ?? "{}")).toEqual({
      path: "/visitanos",
      placement: "page",
      target: "maps",
    });

    // 3. preventDefault in bubble phase suppresses beacon
    let beaconFired = false;
    page.on("request", (req) => {
      if (req.url().endsWith("/api/evento")) {
        beaconFired = true;
      }
    });
    await page.evaluate(() => {
      const link = document.querySelector('a[href="#contacto"]');
      link?.addEventListener("click", (e) => e.preventDefault(), { once: true });
      link?.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, cancelable: true }));
    });
    await page.waitForTimeout(150);
    expect(beaconFired).toBe(false);
  });

  test("attributes clicks inside a data-hero section to the hero placement", async ({ page }) => {
    await gotoReady(page, "/");
    const beaconPromise = page.waitForRequest(
      (req) => req.url().endsWith("/api/evento") && req.method() === "POST",
    );
    await page
      .locator("[data-hero] a[href^='/evangelio']")
      .first()
      .dispatchEvent("auxclick", { bubbles: true, button: 1 });
    const beaconReq = await beaconPromise;
    expect(JSON.parse(beaconReq.postData() ?? "{}")).toEqual({
      path: "/",
      placement: "hero",
      target: "gospel_cta",
    });
  });

  test("/privacidad discloses per-event Cloudflare records, faith-interest categories, and the 24h ibv_conexion cookie in Spanish", async ({
    page,
  }) => {
    await gotoReady(page, "/privacidad");
    await expect(page.getByRole("heading", { name: "Estadísticas del sitio" })).toBeVisible();
    const main = page.locator("main");
    await expect(main).toContainText("Cloudflare");
    await expect(main).toContainText("registro separado");
    await expect(main).toContainText("fecha y hora");
    await expect(main).toContainText("Salvación");
    await expect(main).toContainText("Bautismo");
    await expect(main).not.toContainText("sin datos personales");
    await expect(main).not.toContainText("anónima");
    await expect(main).toContainText("ibv_conexion");
    await expect(main).toContainText("24 horas");
    await expect(main).toContainText("petición de oración");
    await expect(main).toContainText("No vendemos información personal.");
  });
});
