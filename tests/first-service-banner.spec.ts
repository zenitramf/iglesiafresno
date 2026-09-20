import { expect, test } from "@playwright/test";

import { FIRST_SERVICE_BANNER, isFirstServiceBannerVisible } from "../src/lib/first-service-banner";
import { gotoReady } from "./ready";

const duringServiceDay = new Date("2026-10-04T17:00:00-07:00"),
  justBeforeMidnight = new Date("2026-10-04T23:59:59-07:00"),
  afterServiceDay = new Date("2026-10-05T00:00:00-07:00");

test.describe("first-service banner date gate", () => {
  test("is visible through 4 October 2026 in America/Los_Angeles", () => {
    expect(isFirstServiceBannerVisible(duringServiceDay)).toBe(true);
    expect(isFirstServiceBannerVisible(justBeforeMidnight)).toBe(true);
  });

  test("is hidden once the date exceeds 4 October 2026", () => {
    expect(isFirstServiceBannerVisible(afterServiceDay)).toBe(false);
    expect(isFirstServiceBannerVisible(new Date("2026-10-05T12:00:00-07:00"))).toBe(false);
  });
});

test.describe("first-service banner", () => {
  test("shows the first-service notice at the top of the page", async ({ page }) => {
    await page.clock.install({ time: duringServiceDay });
    await page.clock.resume();
    await gotoReady(page);

    const banner = page.locator("[data-first-service-banner]");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Primer servicio: domingo 4 de octubre a las 5:00 p. m.");
    await expect(banner.getByRole("link", { name: "Planea tu visita" })).toHaveAttribute(
      "href",
      FIRST_SERVICE_BANNER.href,
    );

    const headerBox = await page.locator("header").boundingBox(),
      bannerBox = await banner.boundingBox();
    expect(headerBox && bannerBox).toBeTruthy();
    if (!(headerBox && bannerBox)) {
      return;
    }
    expect(bannerBox.y).toBeLessThanOrEqual(headerBox.y + 1);
  });

  test("appears on inner pages while the date gate is open", async ({ page }) => {
    await page.clock.install({ time: duringServiceDay });
    await page.clock.resume();
    await gotoReady(page, "/visitanos");

    await expect(page.locator("[data-first-service-banner]")).toBeVisible();
  });

  test("does not show after 4 October 2026", async ({ page }) => {
    await page.clock.install({ time: afterServiceDay });
    await page.clock.resume();
    await gotoReady(page);

    await expect(page.locator("[data-first-service-banner]")).toHaveCount(0);
  });

  test("Planea tu visita goes to /visitanos and the mobile menu still opens", async ({ page }) => {
    await page.clock.install({ time: duringServiceDay });
    await page.clock.resume();
    await page.setViewportSize({ height: 844, width: 390 });
    await gotoReady(page);

    const banner = page.locator("[data-first-service-banner]");
    await expect(banner).toBeVisible();
    await banner.getByRole("link", { name: "Planea tu visita" }).click();
    await expect(page).toHaveURL(/\/visitanos\/?$/);
    await expect(page.locator("[data-first-service-banner]")).toBeVisible();

    await page.getByRole("button", { name: "Abrir menú" }).click();
    const menu = page.locator("#navbar-3-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "Evangelio" })).toBeVisible();
  });
});
