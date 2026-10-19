import type { Page } from "@playwright/test";

/** Navigate and wait until the main content is visible. */
export const gotoReady = async (page: Page, path = "/"): Promise<void> => {
  await page.goto(path);
  await page.locator("#contenido-principal").waitFor({ state: "visible" });
};
