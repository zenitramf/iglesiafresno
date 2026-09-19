import { expect, test } from "@playwright/test";
import { churchInfo, defaultSEO } from "../src/lib/church-data";
import { gotoReady } from "./ready";

const origin = churchInfo.url;

test.describe("SEO metadata", () => {
  test("homepage has canonical, Open Graph, Twitter, and Church JSON-LD", async ({
    page,
  }) => {
    await gotoReady(page);

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page).toHaveTitle("Iglesia Bautista Victory en Fresno");

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute(
      "content",
      defaultSEO.description
    );

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "index, follow"
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${origin}/`
    );

    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      "es_US"
    );
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      churchInfo.name
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `${origin}/`
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${origin}${defaultSEO.ogImage}`
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image"
    );

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const data = JSON.parse((await jsonLd.textContent()) ?? "{}") as {
      "@type"?: string;
      name?: string;
      sameAs?: string[];
      telephone?: string;
      url?: string;
    };
    expect(data["@type"]).toBe("Church");
    expect(data.name).toBe(churchInfo.name);
    expect(data.url).toBe(origin);
    expect(data.telephone).toBe(churchInfo.phoneE164);
    expect(data.sameAs).toEqual([churchInfo.facebook, churchInfo.youtube]);
  });

  test("inner pages append the site name and canonicalize with a trailing slash", async ({
    page,
  }) => {
    await gotoReady(page, "/nosotros");

    await expect(page).toHaveTitle(`Nosotros | ${churchInfo.name}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${origin}/nosotros/`
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      `Nosotros | ${churchInfo.name}`
    );
  });

  test("visítanos emits FAQPage structured data", async ({ page }) => {
    await gotoReady(page, "/visitanos");

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const data = JSON.parse((await jsonLd.textContent()) ?? "{}") as {
      "@type"?: string;
      mainEntity?: { name?: string }[];
    };
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity?.length).toBeGreaterThan(0);
    expect(data.mainEntity?.[0]?.name).toContain("hijos");
  });

  test("robots.txt points at the sitemap and the sitemap lists public pages", async ({
    request,
  }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    const robotsBody = await robots.text();
    expect(robotsBody).toContain("User-agent: *");
    expect(robotsBody).toContain(`Sitemap: ${origin}/sitemap-index.xml`);

    const sitemapIndex = await request.get("/sitemap-index.xml");
    expect(sitemapIndex.ok()).toBe(true);
    const indexBody = await sitemapIndex.text();
    expect(indexBody).toContain("sitemap-0.xml");

    const sitemap = await request.get("/sitemap-0.xml");
    expect(sitemap.ok()).toBe(true);
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain(`${origin}/`);
    expect(sitemapBody).toContain(`${origin}/evangelio/`);
    expect(sitemapBody).toContain(`${origin}/visitanos/`);
    expect(sitemapBody).toContain(`${origin}/nosotros/`);
  });
});
