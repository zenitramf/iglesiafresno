import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";

export interface CriticalPreload {
  sizes: string;
  src: string;
  srcSet: string;
}

/** Full-bleed courtyard / inner-page hero. */
export const HERO_IMAGE_WIDTHS: number[] = [640, 960, 1280, 1600, 1920];
export const HERO_IMAGE_SIZES = "100vw";
export const HERO_IMAGE_QUALITY = 70;

/**
 * Featured Evangelismo Personal cell. Full width below the @xl container
 * breakpoint (~608px viewport); above it the square photo covers a cell
 * that stays between ~300 and ~500 CSS px on every layout.
 * No 1024w entry: Sharp's output at the source width is twice the 960w bytes.
 */
export const EVANGELISMO_IMAGE_WIDTHS: number[] = [480, 720, 960];
export const EVANGELISMO_IMAGE_SIZES = "(max-width: 607px) calc(100vw - 2rem), 32rem";
export const EVANGELISMO_IMAGE_QUALITY = 70;

export const getCriticalImagePreload = async (
  src: ImageMetadata,
  widths: number[],
  sizes: string,
  quality?: number,
): Promise<CriticalPreload> => {
  const maxWidth = widths.at(-1),
    image = await getImage({
      format: "webp",
      quality,
      sizes,
      src,
      width: maxWidth,
      widths,
    });

  return {
    sizes,
    src: image.src,
    srcSet: image.srcSet.attribute,
  };
};
