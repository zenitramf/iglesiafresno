import { expect, test } from "@playwright/test";

import { gotoReady } from "./ready";

test.describe("Abstract growth hero", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await gotoReady(page);
  });

  test("uses the supplied Fresno Arch SVG without a raster hero image", async ({ page }) => {
    const hero = page.locator('[data-hero-proposal="crecimiento"]');

    await expect(hero.locator('[data-hero-abstract="arco-fresno"]')).toBeVisible();
    await expect(hero.locator("img")).toHaveCount(0);
    await expect(hero.locator("svg[data-fresno-arch][data-hero-motion]")).toHaveCount(1);
    await expect(hero.getByRole("heading", { level: 1 })).toContainText("Crece en la fe.");
    await expect(hero.getByText("Bienvenidos a Iglesia Bautista Victory")).toHaveCount(1);
  });

  test("keeps animation slow and disables it for reduced motion", async ({ page }) => {
    const motion = page.locator("[data-hero-motion]");

    await expect(motion).toHaveCSS("animation-name", "hero-fresno-drift");
    const duration = await motion.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).animationDuration),
    );
    expect(duration).toBeGreaterThanOrEqual(24);
    expect(duration).toBeLessThanOrEqual(30);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(motion).toHaveCSS("animation-name", "none");
  });

  test("stays within the viewport on phone and wide desktop", async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    const phoneWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(phoneWidth).toBeLessThanOrEqual(390);

    await page.setViewportSize({ height: 1080, width: 1920 });
    const desktopWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(desktopWidth).toBeLessThanOrEqual(1920);
  });
});
