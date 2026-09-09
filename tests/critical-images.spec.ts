import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

test.describe("Critical image loading", () => {
  test("homepage preloads hero and evangelismo, then reveals", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await gotoReady(page);

    const preloads = page.locator('link[rel="preload"][as="image"]');
    await expect(preloads).toHaveCount(2);

    const hero = page.locator("[data-hero-frame] img");
    await expect(hero).toHaveAttribute("fetchpriority", "high");
    await expect(hero).toHaveAttribute("data-critical", "true");

    const evangelismo = page.locator("[data-featured-evangelism] img");
    await expect(evangelismo).toHaveAttribute("fetchpriority", "high");
    await expect(evangelismo).toHaveAttribute("data-critical", "true");
    await expect(evangelismo).not.toHaveAttribute("loading", "lazy");

    const giving = page.locator("#ofrendas img");
    await expect(giving).toHaveAttribute("loading", "lazy");

    const whoWeAre = page.locator("[data-who-we-are] img");
    await expect(whoWeAre).toHaveAttribute("loading", "lazy");
  });

  test("inner pages wait on the page hero only", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await gotoReady(page, "/evangelio");

    const preloads = page.locator('link[rel="preload"][as="image"]');
    await expect(preloads).toHaveCount(1);

    const hero = page.locator("#inicio-evangelio img");
    await expect(hero).toHaveAttribute("data-critical", "true");
    await expect(hero).toHaveAttribute("fetchpriority", "high");
  });
});
