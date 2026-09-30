import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("formulario de contacto en /visitanos", () => {
  test("la sección Contáctanos vive en /visitanos", async ({ page }) => {
    await page.goto("/visitanos");
    await expect(page.getByRole("heading", { name: "Contáctanos", level: 2 })).toBeVisible();
    await expect(page.getByLabel("Nombre")).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(page.getByLabel("Teléfono")).toBeVisible();
    await expect(page.getByLabel("Mensaje")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar mensaje" })).toBeVisible();
    await expect(page.getByLabel("Nombre")).toHaveAttribute("maxlength", "200");
    await expect(page.getByLabel("Mensaje")).toHaveAttribute("maxlength", "2000");
  });

  test("un envío completo llega a la página de gracias", async ({ page }) => {
    await page.goto("/visitanos");
    await page.getByLabel("Nombre").fill("María Prueba");
    await page.getByLabel("Correo electrónico").fill("maria@example.com");
    await page.getByLabel("Mensaje").fill("¿A qué hora es el servicio en español?");
    await page.getByRole("button", { name: "Enviar mensaje" }).click();

    await expect(page).toHaveURL(/\/contacto\/gracias\/?$/);
    await expect(page.getByRole("heading", { name: /¡Gracias!/ })).toBeVisible();
  });

  test("un error de longitud conserva el mensaje escrito", async ({ baseURL, page }) => {
    const message = "x".repeat(2001);
    const response = await page.request.post("/contacto", {
      form: { nombre: "María", correo: "maria@example.com", mensaje: message },
      headers: { Origin: baseURL as string },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(422);
    expect(response.headers()["cache-control"]).toBe("no-store");
    const html = await response.text();
    expect(html).toContain("No pudimos enviar el formulario");
    expect(html).toContain("los textos largos");
    expect(html).toContain(message);
    expect(html).toContain('value="María"');
  });

  test("sin medio de contacto muestra el error y conserva valores", async ({ baseURL, page }) => {
    const response = await page.request.post("/contacto", {
      form: { nombre: "María", mensaje: "Hola, pregunta rápida." },
      headers: { Origin: baseURL as string },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(422);
    const html = await response.text();
    expect(html).toContain("Déjanos tu correo electrónico o tu teléfono");
    expect(html).toContain('value="María"');
    expect(html).toContain("Hola, pregunta rápida.");
  });

  test("sin mensaje muestra el error y conserva valores", async ({ baseURL, page }) => {
    const response = await page.request.post("/contacto", {
      form: { nombre: "María", correo: "maria@example.com" },
      headers: { Origin: baseURL as string },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(422);
    const html = await response.text();
    expect(html).toContain("Escribe tu mensaje");
    expect(html).toContain('value="María"');
  });

  test("el honeypot finge éxito", async ({ baseURL, page }) => {
    const response = await page.request.post("/contacto", {
      form: { nombre: "Bot", sitio_web: "http://spam.example", mensaje: "compra ya" },
      headers: { Origin: baseURL as string },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    expect(response.headers().location).toBe("/contacto/gracias");
  });

  test("GET /contacto devuelve al formulario de /visitanos", async ({ request }) => {
    const response = await request.get("/contacto", { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe("/visitanos#contacto");
  });

  test("la página de gracias es pública y estática", async ({ page }) => {
    await page.goto("/contacto/gracias");
    await expect(page.getByRole("heading", { name: /¡Gracias!/ })).toBeVisible();
  });
});
