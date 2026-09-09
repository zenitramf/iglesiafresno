import type { Page } from "@playwright/test";

/** Navigate and wait until the critical-image overlay has lifted. */
export const gotoReady = async (page: Page, path = "/"): Promise<void> => {
  await page.goto(path);
  await page.locator("#critical-boot").waitFor({ state: "hidden" });
};
