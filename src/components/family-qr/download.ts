import { cardRadius, encodeQr, finderRings, fitLogo, makeLayout, markCenter } from "./layout";
import { logoOutline, squircleOutline } from "./shape";

const exportSize = 1200;

function svgPath() {
  let data = "";
  return {
    moveTo(x: number, y: number) { data += `M${x} ${y}`; },
    lineTo(x: number, y: number) { data += `L${x} ${y}`; },
    quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
      data += `Q${cx} ${cy} ${x} ${y}`;
    },
    closePath() { data += "Z"; },
    toString() { return data; },
  };
}

function createSvg(value: string, logo?: HTMLImageElement) {
  const encoded = encodeQr(value);
  if (!encoded) throw new Error("Invalid QR content");

  const { cell, dots, finders, logoWidth } = makeLayout(encoded);
  const card = squircleOutline(0, 0, 1, cardRadius, svgPath());
  const rings = finderRings.map(([width, radius], index) =>
    `<path d="${squircleOutline(-width / 2, -width / 2, width, radius, svgPath())}" fill="${index === 1 ? "white" : "black"}"/>`,
  ).join("");
  const markers = finders.map(({ x, y }) =>
    `<g transform="translate(${x} ${y}) scale(${cell})">${rings}</g>`,
  ).join("");
  const modules = dots.map(({ x, y }) =>
    `<circle cx="${x}" cy="${y}" r="${cell * 0.4}"/>`,
  ).join("");

  let center = `<path transform="translate(${markCenter} ${markCenter}) scale(${logoWidth / 100})" d="${logoOutline(0, svgPath())}" fill-rule="evenodd"/>`;
  if (logo) {
    const { width, height } = fitLogo(logoWidth, logo);
    const image = document.createElement("canvas");
    image.width = Math.max(1, Math.ceil(width * exportSize * 2));
    image.height = Math.max(1, Math.ceil(height * exportSize * 2));
    const ctx = image.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(logo, 0, 0, image.width, image.height);
    center = `<image href="${image.toDataURL("image/png")}" x="${markCenter - width / 2}" y="${markCenter - height / 2}" width="${width}" height="${height}" preserveAspectRatio="none"/>`;
  }

  return new Blob([
    `<svg xmlns="http://www.w3.org/2000/svg" width="${exportSize}" height="${exportSize}" viewBox="0 0 1 1"><path d="${card}" fill="white"/>${modules}${markers}${center}</svg>`,
  ], { type: "image/svg+xml" });
}

async function createPng(svg: Blob) {
  const url = URL.createObjectURL(svg);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = exportSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG encoding failed"));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadQr(value: string, format: "svg" | "png", logo?: HTMLImageElement) {
  const svg = createSvg(value, logo);
  const url = URL.createObjectURL(format === "svg" ? svg : await createPng(svg));
  const link = document.createElement("a");
  link.href = url;
  link.download = `qr-code.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
