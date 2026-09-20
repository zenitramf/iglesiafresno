import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";

export interface CriticalPreload {
  sizes: string;
  src: string;
  srcSet: string;
}

/** Full-bleed courtyard / inner-page hero. */
export const HERO_IMAGE_WIDTHS: number[] = [640, 960, 1280, 1600, 1920, 2400];
export const HERO_IMAGE_SIZES = "100vw";

/** Featured Evangelismo Personal cell (half-width from @xl). */
export const EVANGELISMO_IMAGE_WIDTHS: number[] = [480, 720, 960, 1024];
export const EVANGELISMO_IMAGE_SIZES = "(max-width: 1280px) 100vw, 50vw";

export const getCriticalImagePreload = async (
  src: ImageMetadata,
  widths: number[],
  sizes: string,
): Promise<CriticalPreload> => {
  const image = await getImage({
    format: "webp",
    sizes,
    src,
    widths,
  });

  return {
    sizes,
    src: image.src,
    srcSet: image.srcSet.attribute,
  };
};
