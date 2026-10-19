import { expect, test } from "@playwright/test";

import { gotoReady } from "./ready";

test.describe("Critical image loading", () => {
  test("homepage preloads hero only and lazy-loads below-the-fold images", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await gotoReady(page);

    await expect(page.locator("#critical-boot")).toHaveCount(0);

    const preloads = page.locator('link[rel="preload"][as="image"]');
    await expect(preloads).toHaveCount(1);

    const hero = page.locator("[data-hero-frame] img");
    await expect(hero).toHaveAttribute("fetchpriority", "high");
    await expect(hero).toHaveAttribute("data-critical", "true");
    await expect(hero).toHaveAttribute("decoding", "async");

    const evangelismo = page.locator("[data-featured-evangelism] img");
    await expect(evangelismo).toHaveAttribute("loading", "lazy");
    await expect(evangelismo).toHaveAttribute("decoding", "async");

    const giving = page.locator("#ofrendas img");
    await expect(giving).toHaveAttribute("loading", "lazy");

    const whoWeAre = page.locator("[data-who-we-are] img");
    await expect(whoWeAre).toHaveAttribute("loading", "lazy");
  });

  test("inner pages preload the page hero only", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await gotoReady(page, "/evangelio/");

    const preloads = page.locator('link[rel="preload"][as="image"]');
    await expect(preloads).toHaveCount(1);

    const hero = page.locator("#inicio-evangelio img");
    await expect(hero).toHaveAttribute("data-critical", "true");
    await expect(hero).toHaveAttribute("fetchpriority", "high");
    await expect(hero).toHaveAttribute("decoding", "async");
  });

  test("pages without a hero do not preload the hero image", async ({ page }) => {
    await gotoReady(page, "/contacto/gracias/");

    const preloads = page.locator('link[rel="preload"][as="image"]');
    await expect(preloads).toHaveCount(0);
  });
});
