import { paintLand, type LandColors } from "./landTexture";

/**
 * Paints the land map off the main thread (about 100ms at 4096px), so the
 * page stays responsive while the globe loads. Replies with an ImageBitmap,
 * flipped the way WebGL wants it, handed over without a copy.
 */
self.onmessage = async (e: MessageEvent<{ width: number; colors: LandColors }>) => {
  const { width, colors } = e.data;
  const canvas = new OffscreenCanvas(width, width / 2);
  paintLand(canvas.getContext("2d")!, width, colors);
  const bitmap = await createImageBitmap(canvas, { imageOrientation: "flipY" });
  (self as unknown as { postMessage(message: unknown, transfer: Transferable[]): void }).postMessage(bitmap, [bitmap]);
};
