import { expect, test } from "@playwright/test";

/**
 * Desktop hero courtyard — long-X SVG bound to the title box (plus padding gap).
 * Validates height-lock, title-bound right edge, glass color, and left mask.
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

    await page.setViewportSize({ height: 844, width: 390 });
    await expect(courtyard).toBeHidden();
  });

  test("hero stays within site content width (not full viewport)", async ({
    page,
  }) => {
    // site-container = --container-site 90rem ≈ 1440px
    await page.setViewportSize({ height: 900, width: 1920 });
    await page.goto("/");

    const courtyard = page.locator("[data-hero-courtyard]");
    await expect(courtyard).toBeVisible();
    const box = await courtyard.boundingBox();
    expect(box).toBeTruthy();
    if (!box) {
      return;
    }

    // Capped by site shell; site-gutter keeps it under the viewport
    expect(box.width).toBeLessThanOrEqual(1440);
    expect(box.width).toBeLessThan(1920 * 0.85);
    // Centered with gutters on both sides
    expect(box.x).toBeGreaterThan(80);
  });

  test("shape right edge is bound to the title shell with a gap", async ({
    page,
  }) => {
    const frame = page.locator("[data-hero-frame]");
    const shape = page.locator("[data-hero-shape]");
    const shell = page.locator("[data-hero-copy-shell]");
    const title = page.locator("[data-hero-title]");
    const content = page.locator("[data-hero-content]");
    const svg = shape.locator("svg");

    const frameBox = await frame.boundingBox();
    const shapeBox = await shape.boundingBox();
    const shellBox = await shell.boundingBox();
    const titleBox = await title.boundingBox();
    const contentBox = await content.boundingBox();

    expect(
      frameBox && shapeBox && shellBox && titleBox && contentBox
    ).toBeTruthy();
    if (!(frameBox && shapeBox && shellBox && titleBox && contentBox)) {
      return;
    }

    // Shell / content left-aligned to the frame
    expect(Math.abs(shellBox.x - frameBox.x)).toBeLessThanOrEqual(2);

    // Top/bottom of shape match the courtyard
    expect(Math.abs(shapeBox.y - frameBox.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(shapeBox.height - frameBox.height)).toBeLessThanOrEqual(2);

    // True aspect from height — not stretched
    const expectedWidth = shapeBox.height * (2522 / 937);
    expect(Math.abs(shapeBox.width - expectedWidth)).toBeLessThanOrEqual(3);
    await expect(svg).toHaveAttribute("preserveAspectRatio", "xMinYMid meet");

    // Content-step face of the path (~93.4% of artboard) meets shell right —
    // not the outer ledge (viewBox 100%), so title is not cut by the step.
    const stepRightFrac = 2355.4 / 2522;
    const stepFaceX = shapeBox.x + shapeBox.width * stepRightFrac;
    const shellRight = shellBox.x + shellBox.width;
    expect(Math.abs(stepFaceX - shellRight)).toBeLessThanOrEqual(3);

    // Outer ledge sits past the shell (step protrusion into the photo)
    const shapeRight = shapeBox.x + shapeBox.width;
    expect(shapeRight).toBeGreaterThan(shellRight + 4);

    // Title is inside the shell with padding gap before the step face
    const titleRight = titleBox.x + titleBox.width;
    expect(shellRight - titleRight).toBeGreaterThanOrEqual(48);
    expect(titleBox.x - shellBox.x).toBeGreaterThanOrEqual(16);

    // Shell width tracks title + horizontal padding (may be asymmetric)
    expect(shellBox.width).toBeGreaterThan(titleBox.width);
    expect(shellBox.width - titleBox.width).toBeLessThanOrEqual(160);

    // Long SVG extends left of the frame under the copy
    expect(shapeBox.x).toBeLessThan(frameBox.x + 1);
  });

  const titleBoundViewports = [
    { height: 800, width: 1280 },
    { height: 900, width: 1440 },
    { height: 1080, width: 1920 },
    { height: 720, width: 1600 },
    { height: 1200, width: 1280 },
    { height: 900, width: 1728 },
  ] as const;

  for (const vp of titleBoundViewports) {
    test(`title-bound shape holds at ${vp.width}×${vp.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await page.goto("/");

      const frame = page.locator("[data-hero-frame]");
      const shape = page.locator("[data-hero-shape]");
      const shell = page.locator("[data-hero-copy-shell]");
      const title = page.locator("[data-hero-title]");
      await expect(shape).toBeVisible();

      const frameBox = await frame.boundingBox();
      const shapeBox = await shape.boundingBox();
      const shellBox = await shell.boundingBox();
      const titleBox = await title.boundingBox();
      expect(frameBox && shapeBox && shellBox && titleBox).toBeTruthy();
      if (!(frameBox && shapeBox && shellBox && titleBox)) {
        return;
      }

      expect(Math.abs(shapeBox.height - frameBox.height)).toBeLessThanOrEqual(
        2
      );
      expect(Math.abs(shapeBox.y - frameBox.y)).toBeLessThanOrEqual(2);

      const expectedWidth = shapeBox.height * (2522 / 937);
      expect(Math.abs(shapeBox.width - expectedWidth)).toBeLessThanOrEqual(3);

      // Content-step face aligned to shell right
      const stepRightFrac = 2355.4 / 2522;
      const stepFaceX = shapeBox.x + shapeBox.width * stepRightFrac;
      const shellRight = shellBox.x + shellBox.width;
      expect(Math.abs(stepFaceX - shellRight)).toBeLessThanOrEqual(3);

      // Gap: title ends before the step face
      const titleRight = titleBox.x + titleBox.width;
      expect(shellRight - titleRight).toBeGreaterThanOrEqual(48);

      // Shell leaves room for the photo past the stepped silhouette
      expect(shellBox.width / frameBox.width).toBeLessThan(0.85);
      expect(frameBox.width - shellBox.width).toBeGreaterThan(80);
    });
  }

  test("left edge is masked by the courtyard radius (not square)", async ({
    page,
  }) => {
    const courtyard = page.locator("[data-hero-courtyard]");
    const frame = page.locator("[data-hero-frame]");
    const shell = page.locator("[data-hero-copy-shell]");
    const frameBox = await frame.boundingBox();
    const shellBox = await shell.boundingBox();
    expect(frameBox && shellBox).toBeTruthy();
    if (!(frameBox && shellBox)) {
      return;
    }

    const radius = await courtyard.evaluate((el) => {
      const value = getComputedStyle(el).borderTopLeftRadius;
      return Number.parseFloat(value);
    });
    expect(radius).toBeGreaterThanOrEqual(24);

    // Inside the glass under the title (not the gold border ring)
    const glassSample = await samplePixel(
      page,
      frameBox,
      (shellBox.width * 0.35) / frameBox.width,
      0.45
    );

    // Photo past the title shell / stepped edge
    const photoSample = await samplePixel(
      page,
      frameBox,
      Math.min(0.95, (shellBox.width + 48) / frameBox.width),
      0.45
    );

    expect(colorDistance(glassSample, photoSample)).toBeGreaterThan(12);

    // Just inside the rounded frame corner — should not match solid mid-glass
    // (clipped to radius; may be border or photo, not the glass wash)
    const cornerSample = await samplePixel(page, frameBox, 0.004, 0.004);
    expect(colorDistance(cornerSample, glassSample)).toBeGreaterThan(8);
  });

  test("glass fill uses hero-courtyard-step color token", async ({ page }) => {
    const shape = page.locator("[data-hero-shape]");
    await expect(shape).toBeVisible();

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

    expect(resolved.token.length).toBeGreaterThan(0);
    expect(
      colorDistance(resolved.wrapperColor, resolved.tokenColor)
    ).toBeLessThan(4);
    expect(colorDistance(resolved.fill, resolved.tokenColor)).toBeLessThan(4);
    expect(luminance(resolved.fill)).toBeLessThan(80);
    expect(luminance(resolved.fill)).toBeGreaterThan(5);

    const shell = page.locator("[data-hero-copy-shell]");
    const shellBox = await shell.boundingBox();
    expect(shellBox).toBeTruthy();
    if (!shellBox) {
      return;
    }
    const mid = await samplePixel(page, shellBox, 0.35, 0.45);
    expect(luminance(mid)).toBeLessThan(120);
  });

  test("content overlays the shape; title drives shell width", async ({
    page,
  }) => {
    const shape = page.locator("[data-hero-shape]");
    const shell = page.locator("[data-hero-copy-shell]");
    const title = page.locator("[data-hero-title]");
    const heading = page.getByRole("heading", { level: 1 }).first();

    await expect(heading).toBeVisible();

    const shapeBox = await shape.boundingBox();
    const shellBox = await shell.boundingBox();
    const titleBox = await title.boundingBox();
    const headingBox = await heading.boundingBox();
    expect(shapeBox && shellBox && titleBox && headingBox).toBeTruthy();
    if (!(shapeBox && shellBox && titleBox && headingBox)) {
      return;
    }

    // Shape spans under the shell (extends left; ledge may sit past shell right)
    expect(shapeBox.x).toBeLessThanOrEqual(shellBox.x + 1);
    expect(shapeBox.x + shapeBox.width).toBeGreaterThanOrEqual(
      shellBox.x + shellBox.width - 2
    );

    // Heading sits inside the shell
    expect(headingBox.x).toBeGreaterThanOrEqual(shellBox.x - 1);
    expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(
      shellBox.x + shellBox.width + 1
    );

    // Title is the width driver (within padding)
    expect(titleBox.width).toBeGreaterThan(shellBox.width * 0.5);
  });

  test("right silhouette steps: glass then photo along a mid scanline", async ({
    page,
  }) => {
    const shell = page.locator("[data-hero-copy-shell]");
    const frame = page.locator("[data-hero-frame]");
    const shellBox = await shell.boundingBox();
    const frameBox = await frame.boundingBox();
    expect(shellBox && frameBox).toBeTruthy();
    if (!(shellBox && frameBox)) {
      return;
    }

    // Solid glass under the title body (path is full height on the left side)
    const glass = await samplePixel(page, shellBox, 0.3, 0.4);
    // Past the shell right edge — photo (stepped silhouette ends at shell)
    const pastShape = await samplePixel(
      page,
      frameBox,
      Math.min(0.98, (shellBox.width + 40) / frameBox.width),
      (shellBox.y - frameBox.y + shellBox.height * 0.4) / frameBox.height
    );

    expect(colorDistance(glass, pastShape)).toBeGreaterThan(12);
    expect(luminance(glass)).toBeLessThan(luminance(pastShape) + 5);
  });
});
