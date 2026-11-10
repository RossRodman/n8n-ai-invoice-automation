import { writeFile } from "node:fs/promises";

import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

const WIDTH = 1240;
const HEIGHT = 1754;
const PAPER = 236;
const TONER = 38;
const A4_POINTS: [number, number] = [595.28, 841.89];

function mulberry32(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function makeScan(screenshot: string, out: string, title: string): Promise<void> {
  const page = await sharp(screenshot)
    .greyscale()
    .resize(WIDTH, HEIGHT)
    .linear((PAPER - TONER) / 255, TONER)
    .toBuffer();

  const tilted = await sharp(page)
    .rotate(-0.8, { background: { r: PAPER, g: PAPER, b: PAPER } })
    .toBuffer({ resolveWithObject: true });

  const { data, info } = await sharp(tilted.data)
    .extract({
      left: Math.floor((tilted.info.width - WIDTH) / 2),
      top: Math.floor((tilted.info.height - HEIGHT) / 2),
      width: WIDTH,
      height: HEIGHT,
    })
    .blur(0.6)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const random = mulberry32(5);
  const channels = info.channels;

  for (let i = 0; i < data.length; i += channels) {
    const noise = (random() - 0.5) * 6;
    for (let c = 0; c < Math.min(channels, 3); c++) {
      data[i + c] = Math.max(0, Math.min(255, (data[i + c] ?? 0) + noise));
    }
  }

  for (let speck = 0; speck < 900; speck++) {
    const pixel = Math.floor(random() * WIDTH * HEIGHT) * channels;
    const shade = 60 + Math.floor(random() * 80);
    for (let c = 0; c < Math.min(channels, 3); c++) data[pixel + c] = shade;
  }

  const jpeg = await sharp(data, { raw: { width: WIDTH, height: HEIGHT, channels } })
    .jpeg({ quality: 72 })
    .toBuffer();

  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  const image = await pdf.embedJpg(jpeg);
  pdf
    .addPage(A4_POINTS)
    .drawImage(image, { x: 0, y: 0, width: A4_POINTS[0], height: A4_POINTS[1] });
  await writeFile(out, await pdf.save());
}
