import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { CONNECT_FIELD_LIMITS, CONNECT_MAX_BODY_BYTES } from "../src/lib/connect-form";
import { deriveConnectEntryToken } from "../src/lib/connect-gate";

const readDevVar = (key: string): string => {
  if (process.env[key]) {
    return process.env[key] as string;
  }
  for (const file of [".dev.vars", ".dev.vars.example"]) {
    let contents = "";
    try {
      contents = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const match = contents.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`, "m"));
    if (match) {
      return match[1].replace(/^["']|["']$/g, "");
    }
  }
  throw new Error(`No se encontró ${key} en .dev.vars ni .dev.vars.example`);
};

const qrPath = async (): Promise<string> =>
  `/qr/${await deriveConnectEntryToken(readDevVar("QR_CONNECT_SECRET"))}`;

/** Text body of the latest email captured by the local `send_email` binding. */
const readLatestConnectEmail = (): string => {
  const root = ".wrangler/tmp/email";
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (path.includes("email-text") && path.endsWith(".txt")) {
        files.push(path);
      }
    }
  };
  walk(root);
  files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return readFileSync(files[0], "utf8");
};

test.describe.configure({ mode: "serial" });

test.describe("puerta de acceso por QR", () => {
  test("una visita directa a /conectar va a /visitanos", async ({ page }) => {
    await page.goto("/conectar");
    await expect(page).toHaveURL(/\/visitanos\/?$/);
    await expect(page.getByRole("heading", { name: "Planea Tu Visita" })).toBeVisible();
  });

  test("un token inválido va a /visitanos", async ({ page }) => {
    await page.goto("/qr/token-invalido");
    await expect(page).toHaveURL(/\/visitanos\/?$/);
  });

  for (const token of ["%ZZ", "%E0%A4%A"]) {
    test(`una codificación QR inválida (${token}) va a /visitanos`, async ({ request }) => {
      const response = await request.get(`/qr/${token}`, { maxRedirects: 0 });
      expect(response.status()).toBe(302);
      expect(response.headers().location).toBe("/visitanos");
    });
  }

  test("el enlace del QR guarda la cookie y muestra el formulario", async ({ context, page }) => {
    await page.goto(await qrPath());
    await expect(page).toHaveURL(/\/conectar\/?$/);

    const gateCookie = (await context.cookies()).find((cookie) => cookie.name === "ibv_conexion");
    expect(gateCookie?.httpOnly).toBe(true);
    expect(gateCookie?.sameSite).toBe("Lax");

    await expect(page.getByRole("heading", { name: "Conéctate con nosotros" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tarjeta de conexión" })).toBeVisible();
  });

  test("/conectar/gracias sin cookie va a /visitanos", async ({ page }) => {
    await page.goto("/conectar/gracias");
    await expect(page).toHaveURL(/\/visitanos\/?$/);
  });
});

test.describe("envío del formulario", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(await qrPath());
    await expect(page).toHaveURL(/\/conectar\/?$/);
  });

  test("publica las opciones de la tarjeta de conexión", async ({ page }) => {
    await expect(page.getByLabel("Nombre")).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(page.getByLabel("Teléfono")).toBeVisible();
    await expect(page.getByLabel("¿Cómo podemos orar por usted?")).toBeVisible();

    await expect(page.getByLabel("Sitio web", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Redes sociales", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Familia", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Amigo", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Salvación", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Bautismo", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Grupos pequeños", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Servir", { exact: true }).first()).toBeVisible();
  });

  test("muestra un error cuando falta el nombre", async ({ baseURL, page }) => {
    const response = await page.request.post("/api/conectar", {
      form: { nombre: "", telefono: "559-000-0000" },
      headers: { Origin: baseURL as string },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(422);
    expect(await response.text()).toContain("Escribe tu nombre");
    expect(response.headers()["cache-control"]).toBe("no-store");
  });

  test("muestra un error cuando falta el medio de contacto", async ({ baseURL, page }) => {
    const response = await page.request.post("/api/conectar", {
      form: { nombre: "Ana" },
      headers: { Origin: baseURL as string },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(422);
    expect(await response.text()).toContain("Déjanos tu correo electrónico o tu teléfono");
  });

  test("muestra un error cuando el correo no es válido", async ({ baseURL, page }) => {
    const response = await page.request.post("/api/conectar", {
      form: { correo: "no-es-correo", nombre: "Ana" },
      headers: { Origin: baseURL as string },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(422);
    expect(await response.text()).toContain("Revisa tu correo electrónico");
  });

  test("conserva los valores y opciones seleccionadas después de un error", async ({ page }) => {
    const prayer =
      "\nOren por mi familia.\n</textarea><script>throw new Error('no ejecutar')</script>";
    await page.getByLabel("Nombre").fill("Ana & Familia");
    await page.getByLabel("¿Cómo podemos orar por usted?").fill(prayer);
    await page.getByLabel("Familia", { exact: true }).check();
    await page.getByLabel("Salvación", { exact: true }).check();
    await page.locator("#como-se-entero-otro").check();
    await page.locator("#interes-otro").check();
    await page.locator('[name="como_se_entero_otro"]').fill('Invitación "especial"');
    await page.locator('[name="intereses_otro"]').fill("Clases");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByRole("alert")).toContainText("Déjanos tu correo electrónico");
    await expect(page.getByLabel("Nombre")).toHaveValue("Ana & Familia");
    await expect(page.getByLabel("¿Cómo podemos orar por usted?")).toHaveValue(prayer);
    await expect(page.getByLabel("Familia", { exact: true })).toBeChecked();
    await expect(page.getByLabel("Salvación", { exact: true })).toBeChecked();
    await expect(page.locator("#como-se-entero-otro")).toBeChecked();
    await expect(page.locator('[name="como_se_entero_otro"]')).toBeVisible();
    await expect(page.locator('[name="como_se_entero_otro"]')).toHaveValue('Invitación "especial"');
    await expect(page.locator('[name="intereses_otro"]')).toHaveValue("Clases");
  });

  test("rechaza valores largos sin recortarlos y expone límites nativos", async ({
    baseURL,
    page,
  }) => {
    const prayer = `${"a".repeat(CONNECT_FIELD_LIMITS.oracion)}NO-RECORTAR`;
    await expect(page.locator('[name="oracion"]')).toHaveAttribute("maxlength", "2000");
    await expect(page.getByLabel("Nombre")).toHaveAttribute("maxlength", "200");
    const response = await page.request.post("/api/conectar", {
      form: { nombre: "Ana", correo: "ana@example.com", oracion: prayer },
      headers: { Origin: baseURL as string },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(422);
    const html = await response.text();
    expect(html).toContain(prayer);
    expect(html).toContain(
      "los textos largos (petición de oración o mensaje) admiten hasta 2000 caracteres",
    );
    expect(response.headers().location).toBeUndefined();
  });

  test("rechaza solicitudes demasiado grandes y formatos no admitidos", async ({
    baseURL,
    page,
  }) => {
    const large = await page.request.post("/api/conectar", {
      data: `oracion=${"a".repeat(CONNECT_MAX_BODY_BYTES)}`,
      headers: { Origin: baseURL as string, "Content-Type": "application/x-www-form-urlencoded" },
    });
    expect(large.status()).toBe(413);
    expect(await large.text()).toContain("supera el tamaño permitido");
    const unsupported = await page.request.post("/api/conectar", {
      data: "{}",
      headers: { Origin: baseURL as string, "Content-Type": "application/json" },
    });
    expect(unsupported.status()).toBe(415);
    const malformed = await page.request.post("/api/conectar", {
      data: "nombre=%ZZ",
      headers: { Origin: baseURL as string, "Content-Type": "application/x-www-form-urlencoded" },
    });
    expect(malformed.status()).toBe(400);
    expect(await malformed.text()).toContain("No pudimos leer el formulario");
  });

  test("sin cookie, el envío va a /visitanos", async ({ baseURL, request }) => {
    const response = await request.post("/api/conectar", {
      form: { correo: "ana@example.com", nombre: "Ana" },
      headers: { Origin: baseURL as string },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe("/visitanos");
  });

  test("un envío completo llega a /conectar/gracias y se envía por correo", async ({ page }) => {
    await page.getByLabel("Nombre").fill("Ana Prueba E2E");
    await page.getByLabel("Correo electrónico").fill("ana@example.com");
    await page.getByLabel("Teléfono").fill("559-000-0000");
    await page.getByLabel("Familia", { exact: true }).first().check();
    await page.getByLabel("Salvación", { exact: true }).first().check();
    await page.getByLabel("¿Cómo podemos orar por usted?").fill("Oren por mi familia.");
    await page.getByRole("button", { name: "Enviar" }).click();

    await expect(page).toHaveURL(/\/conectar\/gracias\/?$/);
    await expect(page.getByRole("heading", { name: /¡Gracias!/ })).toBeVisible();

    const email = readLatestConnectEmail();
    expect(email).toContain("Ana Prueba E2E");
    expect(email).toContain("ana@example.com");
    expect(email).toContain("Familia");
    expect(email).toContain("Salvación");
    expect(email).toContain("Oren por mi familia.");
  });
});
