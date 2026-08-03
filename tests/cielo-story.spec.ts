import { expect, test } from "@playwright/test";

/**
 * Guards: the /cielo linear story keeps the evangelio content intact —
 * hero question, four steps in order with their verses, prayer, assurance.
 */
const MIN_HERO_FONT_SIZE_PX = 48;

const STEP_HEADINGS = [
  "Reconozca que es pecador",
  "Reconozca que hay un precio por el pecado",
  "Reconozca que Cristo pagó por sus pecados",
  "Deposite su fe en Cristo y profese su fe",
] as const;

const VERSE_CITATIONS = [
  "Romanos 3:10",
  "Romanos 3:23",
  "Romanos 6:23",
  "Apocalipsis 21:8",
  "Romanos 5:8",
  "Romanos 10:9",
  "Efesios 2:8-9",
  "1 Juan 5:13",
] as const;

test.describe("Cielo story page", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await page.goto("/cielo", { waitUntil: "networkidle" });
  });

  test("hero asks the driving question at display size", async ({ page }) => {
    const h1 = page.locator("#inicio-cielo h1");
    await expect(h1).toBeVisible();

    // Allow fonts/layout to settle — title must NOT collapse to body size
    await page.waitForTimeout(200);
    const fontSize = await h1.evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).fontSize)
    );
    expect(fontSize).toBeGreaterThanOrEqual(MIN_HERO_FONT_SIZE_PX);

    const title = (await h1.innerText()).replace(/\s+/g, " ").trim();
    expect(title).toBe("¿Cómo puedo ir al cielo?");
  });

  test("the four steps appear in order", async ({ page }) => {
    const headings = page.locator("section[id^='paso-'] h2");
    await expect(headings).toHaveCount(STEP_HEADINGS.length);

    const texts = await headings.allInnerTexts();
    const normalized = texts.map((text) => text.replace(/\s+/g, " ").trim());
    expect(normalized).toEqual([...STEP_HEADINGS]);
  });

  test("every verse from the message is cited", async ({ page }) => {
    await Promise.all(
      VERSE_CITATIONS.map((citation) =>
        expect(page.locator("cite").filter({ hasText: citation })).toHaveCount(
          1
        )
      )
    );
  });

  test("the suggested prayer renders in full", async ({ page }) => {
    const prayer = page.locator("#oracion blockquote");
    const text = (await prayer.innerText()).replace(/\s+/g, " ");
    expect(text).toContain(
      "Señor, reconozco que soy pecador y que el pecado me separa de ti."
    );
    expect(text).toContain("En el nombre de Jesús. Amén.");
  });

  test("assurance and invitation close the story", async ({ page }) => {
    const assurance = page.locator("#oraste-sinceramente");
    await expect(assurance.locator("h2")).toHaveText("¿Oraste sinceramente?");

    const invitation = page.locator("#conversemos");
    const text = (await invitation.innerText()).replace(/\s+/g, " ");
    expect(text).toContain("Gracias por tomarte el tiempo");
    expect(text).toContain("¡Que Dios te bendiga!");
  });

  test("no page errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
});
