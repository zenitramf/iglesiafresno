import { expect, test } from "@playwright/test";

/**
 * Desktop hero courtyard — SVG silhouette replaces the old CSS step stack.
 * Validates geometry (left mask / right steps) and glass fill color.
 */
const DESKTOP = { height: 900, width: 1440 } as const;

/** Sample a single CSS pixel from a locator’s box (device pixels via DPR). */
async function samplePixel(
  page: import("@playwright/test").Page,
  box: { x: number; y: number; width: number; height: number },
  relX: number,
  relY: number
): Promise<{ r: number; g: number; b: number; a: number }> {
  const dpr = await page.evaluate(() => window.devicePixelRatio || 1);
  const shot = await page.screenshot({
    clip: {
      height: box.height,
      width: box.width,
      x: box.x,
      y: box.y,
    },
    type: "png",
  });

  // Decode PNG via canvas in the page
  const dataUrl = `data:image/png;base64,${shot.toString("base64")}`;
  return page.evaluate(
    ({ dataUrl: url, relX: rx, relY: ry, dpr: ratio, cssW, cssH }) =>
      new Promise<{ r: number; g: number; b: number; a: number }>(
        (resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("no 2d context"));
              return;
            }
            ctx.drawImage(img, 0, 0);
            const px = Math.min(
              img.width - 1,
              Math.max(0, Math.round(rx * cssW * ratio))
            );
            const py = Math.min(
              img.height - 1,
              Math.max(0, Math.round(ry * cssH * ratio))
            );
            const [r, g, b, a] = ctx.getImageData(px, py, 1, 1).data;
            resolve({ a, b, g, r });
          };
          img.onerror = () => reject(new Error("png decode failed"));
          img.src = url;
        }
      ),
    {
      cssH: box.height,
      cssW: box.width,
      dataUrl,
      dpr,
      relX,
      relY,
    }
  );
}

function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function colorDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number }
): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

test.describe("Hero courtyard SVG", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
  });

  test("desktop shows long-X SVG shape; mobile hides it", async ({ page }) => {
    const courtyard = page.locator("[data-hero-courtyard]");
    const shape = page.locator("[data-hero-shape]");
    const svg = shape.locator("svg");

    await expect(courtyard).toBeVisible();
    await expect(shape).toBeVisible();
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("viewBox", "0 0 2522 937");

    // Mobile layout must not show the courtyard SVG
    await page.setViewportSize({ height: 844, width: 390 });
    await expect(courtyard).toBeHidden();
  });

  test("shape is height-locked and slides so stepped edge meets glass band", async ({
    page,
  }) => {
    const frame = page.locator("[data-hero-frame]");
    const shape = page.locator("[data-hero-shape]");
    const content = page.locator("[data-hero-content]");
    const svg = shape.locator("svg");

    const frameBox = await frame.boundingBox();
    const shapeBox = await shape.boundingBox();
    const contentBox = await content.boundingBox();

    expect(frameBox).toBeTruthy();
    expect(shapeBox).toBeTruthy();
    expect(contentBox).toBeTruthy();
    if (!(frameBox && shapeBox && contentBox)) {
      return;
    }

    // Content left-aligned to the frame
    expect(Math.abs(contentBox.x - frameBox.x)).toBeLessThanOrEqual(2);

    // Top/bottom match the courtyard exactly
    expect(Math.abs(shapeBox.y - frameBox.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(shapeBox.height - frameBox.height)).toBeLessThanOrEqual(2);

    // True aspect from height (long-X artboard) — not stretched
    const expectedWidth = shapeBox.height * (2522 / 937);
    expect(Math.abs(shapeBox.width - expectedWidth)).toBeLessThanOrEqual(3);

    // Full path fit (meet), not slice/none
    await expect(svg).toHaveAttribute("preserveAspectRatio", "xMinYMid meet");

    // Glass band is ½–⅔ of the frame
    const bandRatio = contentBox.width / frameBox.width;
    expect(bandRatio).toBeGreaterThanOrEqual(0.5 - 0.01);
    expect(bandRatio).toBeLessThanOrEqual(2 / 3 + 0.01);

    // Shape right edge aligns with content right edge (horizontal slide)
    const shapeRight = shapeBox.x + shapeBox.width;
    const contentRight = contentBox.x + contentBox.width;
    expect(Math.abs(shapeRight - contentRight)).toBeLessThanOrEqual(3);

    // When the long SVG is wider than the band, it slides left of the frame
    if (shapeBox.width > contentBox.width + 1) {
      expect(shapeBox.x).toBeLessThan(frameBox.x + 1);
    }
  });

  const slideViewports = [
    { height: 800, width: 1280 },
    { height: 900, width: 1440 },
    { height: 1080, width: 1920 },
    { height: 720, width: 1600 },
    { height: 1200, width: 1280 },
  ] as const;

  for (const vp of slideViewports) {
    test(`height-lock + slide band holds at ${vp.width}×${vp.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await page.goto("/");

      const frame = page.locator("[data-hero-frame]");
      const shape = page.locator("[data-hero-shape]");
      const content = page.locator("[data-hero-content]");
      await expect(shape).toBeVisible();

      const frameBox = await frame.boundingBox();
      const shapeBox = await shape.boundingBox();
      const contentBox = await content.boundingBox();
      expect(frameBox && shapeBox && contentBox).toBeTruthy();
      if (!(frameBox && shapeBox && contentBox)) {
        return;
      }

      // Top/bottom locked to courtyard
      expect(Math.abs(shapeBox.height - frameBox.height)).toBeLessThanOrEqual(
        2
      );
      expect(Math.abs(shapeBox.y - frameBox.y)).toBeLessThanOrEqual(2);

      // Width is pure aspect from height (long-X viewBox)
      const expectedWidth = shapeBox.height * (2522 / 937);
      expect(Math.abs(shapeBox.width - expectedWidth)).toBeLessThanOrEqual(3);

      // Glass band ½–⅔
      const bandRatio = contentBox.width / frameBox.width;
      expect(bandRatio).toBeGreaterThanOrEqual(0.5 - 0.01);
      expect(bandRatio).toBeLessThanOrEqual(2 / 3 + 0.01);

      // Stepped edge (shape right) meets band right
      const shapeRight = shapeBox.x + shapeBox.width;
      const contentRight = contentBox.x + contentBox.width;
      expect(Math.abs(shapeRight - contentRight)).toBeLessThanOrEqual(3);
    });
  }

  test("left edge is masked by the courtyard radius (not square)", async ({
    page,
  }) => {
    const courtyard = page.locator("[data-hero-courtyard]");
    const frame = page.locator("[data-hero-frame]");
    const content = page.locator("[data-hero-content]");
    const frameBox = await frame.boundingBox();
    const contentBox = await content.boundingBox();
    expect(frameBox && contentBox).toBeTruthy();
    if (!(frameBox && contentBox)) {
      return;
    }

    const radius = await courtyard.evaluate((el) => {
      const value = getComputedStyle(el).borderTopLeftRadius;
      return Number.parseFloat(value);
    });
    expect(radius).toBeGreaterThanOrEqual(24); // rounded-4xl ≈ 2rem

    // Top-left of the frame (outside the arc): not solid glass
    const cornerSample = await samplePixel(page, frameBox, 0.002, 0.002);

    // Mid glass band: glass fill
    const glassSample = await samplePixel(
      page,
      frameBox,
      (contentBox.width * 0.25) / frameBox.width,
      0.5
    );

    // Photo past the glass band
    const photoSample = await samplePixel(
      page,
      frameBox,
      Math.min(0.95, (contentBox.width + 48) / frameBox.width),
      0.5
    );

    expect(colorDistance(glassSample, photoSample)).toBeGreaterThan(12);

    const distCornerToGlass = colorDistance(cornerSample, glassSample);
    const distCornerToPhoto = colorDistance(cornerSample, photoSample);
    expect(distCornerToGlass).toBeGreaterThan(10);
    expect(distCornerToPhoto).toBeLessThan(distCornerToGlass + 5);
  });

  test("glass fill uses hero-courtyard-step color token", async ({ page }) => {
    const shape = page.locator("[data-hero-shape]");
    await expect(shape).toBeVisible();

    /**
     * Resolve any CSS color (oklch, color-mix, currentColor, …) to sRGB via canvas.
     * getComputedStyle alone may return non-rgb() serializations.
     */
    const resolved = await shape.evaluate((el) => {
      const toRgba = (cssColor: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          throw new Error("no 2d context");
        }
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = cssColor;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return { a: a / 255, b, g, r };
      };

      const styles = getComputedStyle(el);
      const colorValue = styles.color;

      const token = getComputedStyle(document.documentElement)
        .getPropertyValue("--hero-courtyard-step")
        .trim();

      const path = el.querySelector("path");
      const pathFillRaw = path ? getComputedStyle(path).fill : "";

      // Path uses fill="currentColor" — resolve against the shape's color
      const fillCss =
        !pathFillRaw ||
        pathFillRaw === "none" ||
        pathFillRaw.includes("currentColor")
          ? colorValue
          : pathFillRaw;

      return {
        color: colorValue,
        fill: toRgba(fillCss),
        pathFillRaw,
        token,
        tokenColor: toRgba(token || colorValue),
        wrapperColor: toRgba(colorValue),
      };
    });

    // Design token must be defined
    expect(resolved.token.length).toBeGreaterThan(0);

    // text-hero-courtyard-step on the wrapper matches the token
    expect(
      colorDistance(resolved.wrapperColor, resolved.tokenColor)
    ).toBeLessThan(4);

    // Path fill matches the same glass token
    expect(colorDistance(resolved.fill, resolved.tokenColor)).toBeLessThan(4);

    // Dark glass, not pure black/white
    expect(luminance(resolved.fill)).toBeLessThan(80);
    expect(luminance(resolved.fill)).toBeGreaterThan(5);

    // Pixel sample in the visible glass band (composited over photo)
    const content = page.locator("[data-hero-content]");
    const contentBox = await content.boundingBox();
    expect(contentBox).toBeTruthy();
    if (!contentBox) {
      return;
    }
    const mid = await samplePixel(page, contentBox, 0.35, 0.45);
    // Glass is a translucent dark wash — mid sample should be relatively dark
    expect(luminance(mid)).toBeLessThan(120);
  });

  test("content overlays the shape middle band", async ({ page }) => {
    const shape = page.locator("[data-hero-shape]");
    const content = page.locator("[data-hero-content]");
    const heading = content.getByRole("heading", { level: 1 });

    await expect(heading).toBeVisible();

    const shapeBox = await shape.boundingBox();
    const contentBox = await content.boundingBox();
    const headingBox = await heading.boundingBox();
    expect(shapeBox && contentBox && headingBox).toBeTruthy();
    if (!(shapeBox && contentBox && headingBox)) {
      return;
    }

    // Shape spans the glass band (may extend left of the frame when slid)
    expect(shapeBox.x).toBeLessThanOrEqual(contentBox.x + 1);
    expect(shapeBox.x + shapeBox.width).toBeGreaterThanOrEqual(
      contentBox.x + contentBox.width - 3
    );

    // Heading sits inside the content band
    expect(headingBox.x).toBeGreaterThanOrEqual(contentBox.x - 1);
    expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(
      contentBox.x + contentBox.width + 1
    );
    expect(headingBox.y).toBeGreaterThan(contentBox.y);
    expect(headingBox.y + headingBox.height).toBeLessThan(
      contentBox.y + contentBox.height
    );

    // Roughly in the vertical middle band (not jammed into the top 10%)
    const relTop = (headingBox.y - contentBox.y) / contentBox.height;
    expect(relTop).toBeGreaterThan(0.12);
    expect(relTop).toBeLessThan(0.55);
  });

  test("right silhouette steps: glass then photo along a mid scanline", async ({
    page,
  }) => {
    const content = page.locator("[data-hero-content]");
    const frame = page.locator("[data-hero-frame]");
    const contentBox = await content.boundingBox();
    const frameBox = await frame.boundingBox();
    expect(contentBox && frameBox).toBeTruthy();
    if (!(contentBox && frameBox)) {
      return;
    }

    // Inside the glass band vs just past the stepped edge
    const glass = await samplePixel(page, contentBox, 0.45, 0.3);
    const nearRightEdge = await samplePixel(page, contentBox, 0.88, 0.3);
    const pastShape = await samplePixel(
      page,
      frameBox,
      Math.min(0.98, (contentBox.width + 40) / frameBox.width),
      (contentBox.y - frameBox.y + contentBox.height * 0.3) / frameBox.height
    );

    // Interior glass samples should be similar to each other
    expect(colorDistance(glass, nearRightEdge)).toBeLessThan(40);

    // Past the shape should look like the photo (different from glass)
    expect(colorDistance(glass, pastShape)).toBeGreaterThan(12);
  });
});
