import { expect, test } from "@playwright/test";

/**
 * Container query breakpoints on the vision section (@container):
 * @2xl ≈ 42rem = 672px container width
 * @4xl ≈ 56rem = 896px container width
 *
 * Viewport widths are chosen so the container crosses those thresholds.
 */
const viewports = [
  { expectedCols: 1, height: 844, name: "mobile-1col", width: 390 },
  { expectedCols: 2, height: 1024, name: "tablet-2col", width: 900 },
  { expectedCols: 3, height: 800, name: "desktop-3col", width: 1280 },
  { expectedCols: 3, height: 900, name: "wide-3col", width: 1536 },
] as const;

/** Small vision cards only — Evangelismo Personal is the featured cell. */
const PILLAR_TITLES = [
  "Predicación y Enseñanza Bíblica",
  "Discipulado Personal",
  "Ministerio Familiar",
  "Mentalidad Misionera",
  "Santificación Personal",
] as const;

function roundTop(y: number): number {
  return Math.round(y);
}

function rowsFromCards(boxes: { x: number; y: number; width: number }[]) {
  const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: (typeof boxes)[] = [];

  for (const box of sorted) {
    const top = roundTop(box.y);
    const row = rows.find((r) => Math.abs(roundTop(r[0].y) - top) <= 2);
    if (row) {
      row.push(box);
    } else {
      rows.push([box]);
    }
  }

  return rows.map((row) => row.sort((a, b) => a.x - b.x));
}

test.describe("Vision bento layout", () => {
  for (const vp of viewports) {
    test(`layout holds at ${vp.name} (${vp.width}×${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: vp.height, width: vp.width });
      await page.goto("/");

      const section = page.locator("[data-vision-bento]");
      await expect(section).toBeVisible();

      const featured = page.locator("[data-featured-evangelism]");
      await expect(featured).toBeVisible();
      await expect(
        featured.getByRole("heading", { name: "Evangelismo Personal" })
      ).toBeVisible();
      await expect(
        featured.getByText(
          "Alcanzar a nuestra comunidad con el mensaje del evangelio mediante visitas regulares y ministerios de alcance."
        )
      ).toBeVisible();

      // Featured only — must not also appear as a small vision card
      const smallEvangelism = page.locator("[data-vision-card]", {
        has: page.getByRole("heading", { name: "Evangelismo Personal" }),
      });
      await expect(smallEvangelism).toHaveCount(0);

      const cards = page.locator("[data-vision-card]");
      await expect(cards).toHaveCount(5);

      await Promise.all(
        PILLAR_TITLES.map((title) =>
          expect(section.getByRole("heading", { name: title })).toBeVisible()
        )
      );

      const boxes = await cards.evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { height: r.height, width: r.width, x: r.x, y: r.y };
        })
      );

      const rows = rowsFromCards(boxes);

      if (vp.expectedCols === 1) {
        expect(rows.length).toBe(5);
        for (const row of rows) {
          expect(row.length).toBe(1);
        }
        return;
      }

      if (vp.expectedCols === 3) {
        // Classic bento: featured 2×2 + 5 cards → complete 3×3, no orphan row
        // Small cards form rows of 1+1 beside featured, then a full row of 3
        // (or various tops depending on featured height). Assert no last-row
        // singleton when there are enough cards to fill.
        const lastRow = rows.at(-1);
        expect(lastRow, "expected at least one pillar row").toBeTruthy();
        if (lastRow && rows.length > 1) {
          // Last row of small cards in the 3-col bento should be full (3)
          // when it is the bottom row of the 3×3 (cards 3–5).
          const bottomFullRows = rows.filter((r) => r.length === 3);
          expect(
            bottomFullRows.length,
            `3-col bento should include a full row of 3 at ${vp.name}`
          ).toBeGreaterThanOrEqual(1);
        }
        expect(boxes.length).toBe(5);
        return;
      }

      // 2-col: featured full width, then pairs of cards; last card spans full
      // width so there is no half-row orphan.
      expect(boxes.length).toBe(5);
      const pairRows = rows.filter((r) => r.length === 2);
      expect(pairRows.length).toBe(2);
      const lastRow = rows.at(-1);
      expect(lastRow?.length).toBe(1);
      const grid = page.locator("[data-vision-grid]");
      const gridBox = await grid.boundingBox();
      expect(gridBox).not.toBeNull();
      if (gridBox && lastRow?.[0]) {
        expect(
          Math.abs(lastRow[0].width - gridBox.width),
          `last card should span full grid width at ${vp.name}`
        ).toBeLessThan(8);
      }
    });
  }

  test("section is vision-oriented with featured evangelismo personal", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 1280 });
    await page.goto("/");

    const section = page.locator("#vision");
    await expect(section).toBeVisible();
    await expect(section.getByText("Visión", { exact: true })).toBeVisible();
    await expect(page.locator("#evangelismo")).toBeVisible();
    await expect(page.locator("#ministerios")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Niños" })).toHaveCount(0);

    // Exact pillar copy present once each
    await expect(
      page.getByText(
        "Exposición fiel de las Escrituras, enseñando precepto por precepto."
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        "Equipar a los nuevos creyentes para que crezcan en su fe y sirvan dentro de la iglesia local."
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        "Vivir una vida cristiana apartada de la cultura secular, conforme a la imagen de Cristo."
      )
    ).toBeVisible();
  });
});
