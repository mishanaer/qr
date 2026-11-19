import { encode, type QrCodeGenerateResult } from "uqr";

// Vertical gradient stops sampled at the finder, intermediate rows, and logo.
export const palettes = [
  [0x00e80b, 0x03e500, 0x2ce200, 0x56e000, 0x9adc00],
  [0xff5f00, 0xfe4600, 0xfd3600, 0xff2700, 0xff1300],
  [0x626bec, 0x6373e6, 0x677bdd, 0x6783d7, 0x6c8acb],
  [0x2500d2, 0x5600a6, 0x7e007b, 0xa80054, 0xd30024],
  [0x007dfe, 0x0080ff, 0x0c79ff, 0x226ffe, 0x3d60fb],
  [0xfe00a4, 0xff0099, 0xff0086, 0xff0077, 0xfe005e],
  [0xff5a00, 0xff4400, 0xff2900, 0xff1300, 0xfe0000],
];
const stops = [0.16, 0.35, 0.5, 0.65, 0.84];
export function paletteAt(index: number, y: number) {
  const upper = stops.findIndex((stop) => y <= stop);
  const lo = upper < 0 ? 4 : Math.max(0, upper - 1);
  const hi = Math.min(4, lo + 1);
  const t =
    lo === hi ? 0 : Math.max(0, (y - stops[lo]) / (stops[hi] - stops[lo]));
  return [16, 8, 0].map((shift) => {
    const a = (palettes[index][lo] >> shift) & 255;
    return a + (((palettes[index][hi] >> shift) & 255) - a) * t;
  });
}

const inset = 24 / 366;
export const markCenter = 0.5 + 1 / 366;
export const cardRadius = 0.173;
export const finderRings = [[7, 3], [5.6, 2.04], [3.3, 1]] as const;

export function fitLogo(side: number, image: HTMLImageElement) {
  const aspect = image.naturalWidth / image.naturalHeight;
  return { width: side * Math.min(1, aspect), height: side * Math.min(1, 1 / aspect) };
}

export function encodeQr(value: string) {
  try {
    return encode(Array.from(new TextEncoder().encode(value)), {
      ecc: "Q",
      minVersion: 4,
      maskPattern: 4,
      border: 0,
    });
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

export function makeLayout(image: QrCodeGenerateResult) {
  const n = image.size;
  const cell = (1 - 2 * inset) / n;
  // Bound the covered data area even when a longer value needs a denser matrix.
  const clear = 9;
  const start = (n - clear) / 2;
  // Group dots by column for painting. The encoder stores modules by row.
  const dots = Array.from({ length: n }, (_, c) =>
    image.data.flatMap((row, r) => {
      if (
        !row[c] ||
        (r < 7 && (c < 7 || c >= n - 7)) ||
        (c < 7 && r >= n - 7) ||
        (r >= start && r < start + clear && c >= start && c < start + clear)
      )
        return [];
      const x = inset + (c + 0.5) * cell;
      const y = inset + (r + 0.5) * cell;
      return [
        {
          x,
          y,
          distance: Math.hypot(x - 0.5, y - 0.5),
          colors: palettes.map((_, p) => paletteAt(p, y)),
          brush: 1,
        },
      ];
    }),
  ).flat();
  const finders = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ].map(([c, r]) => {
    const x = inset + (c + 3.5) * cell + cell * 0.104;
    const y = inset + (r + 3.5) * cell + cell * 0.104;
    return { x, y, colors: palettes.map((_, p) => paletteAt(p, y)) };
  });
  return { cell, dots, logoWidth: (clear - 3) * cell, finders };
}
