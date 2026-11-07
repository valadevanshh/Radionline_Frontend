/**
 * Prepare a signature for a white report without redrawing the strokes.
 *
 * Dark ink on light paper stays dark and the paper becomes transparent.
 * Light ink on a grey or dark field keeps the same stroke mask, is coloured
 * dark enough to read, and the field becomes transparent. An image that is
 * already transparent is left as-is unless the strokes themselves are light.
 * Too little ink returns the original pixels.
 */

function lum(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load signature image'));
    img.src = src;
  });
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)];
}

function corners(w: number, h: number): Array<[number, number, number, number]> {
  return [
    [0, 0, Math.min(80, w), Math.min(80, h)],
    [Math.max(0, w - 80), 0, w, Math.min(80, h)],
    [0, Math.max(0, h - 80), Math.min(80, w), h],
    [Math.max(0, w - 80), Math.max(0, h - 80), w, h],
  ];
}

function keepComponents(alpha: Uint16Array, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = alpha[i] >= 36 ? 1 : 0;
  const visited = new Uint8Array(w * h);
  const keep = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || visited[i]) continue;
    stack.length = 0;
    stack.push(i);
    visited[i] = 1;
    const comp: number[] = [];
    while (stack.length) {
      const cur = stack.pop() as number;
      comp.push(cur);
      const cx = cur % w;
      const cy = (cur / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (mask[ni] && !visited[ni]) {
            visited[ni] = 1;
            stack.push(ni);
          }
        }
      }
    }
    if (comp.length >= 25) for (const c of comp) keep[c] = 1;
  }
  return keep;
}

function cropAndEncode(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  px: Uint8ClampedArray,
  w: number,
  h: number,
  original: HTMLCanvasElement,
): string {
  let minx = w;
  let miny = h;
  let maxx = 0;
  let maxy = 0;
  let count = 0;
  for (let i = 0; i < w * h; i++) {
    if (px[i * 4 + 3] < 48) continue;
    count += 1;
    const x = i % w;
    const y = (i / w) | 0;
    if (x < minx) minx = x;
    if (y < miny) miny = y;
    if (x > maxx) maxx = x;
    if (y > maxy) maxy = y;
  }
  const image = ctx.createImageData(w, h);
  image.data.set(px);
  ctx.putImageData(image, 0, 0);
  if (count < 30 || maxx < minx) return original.toDataURL('image/png');
  const pad = 12;
  const sx = Math.max(0, minx - pad);
  const sy = Math.max(0, miny - pad);
  const sw = Math.min(w, maxx + 1 + pad) - sx;
  const sh = Math.min(h, maxy + 1 + pad) - sy;
  const cropped = document.createElement('canvas');
  cropped.width = sw;
  cropped.height = sh;
  const cctx = cropped.getContext('2d');
  if (!cctx) return canvas.toDataURL('image/png');
  cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropped.toDataURL('image/png');
}

/** Process a File or data URL → cleaned transparent PNG data URL. */
export async function processSignatureImage(input: File | string): Promise<string> {
  const dataUrl =
    typeof input === 'string'
      ? input
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Could not read that file.'));
          reader.readAsDataURL(input);
        });

  const img = await loadImage(dataUrl);
  const maxSide = 1600;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error('Invalid signature image');
  const scale = Math.min(1, maxSide / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, 0, 0, w, h);
  const original = document.createElement('canvas');
  original.width = w;
  original.height = h;
  original.getContext('2d')?.drawImage(canvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;

  let transparent = 0;
  for (let i = 0; i < w * h; i++) if (px[i * 4 + 3] < 24) transparent += 1;
  if (transparent >= 0.35 * w * h) {
    let inkN = 0;
    let inkLum = 0;
    for (let i = 0; i < w * h; i++) {
      if (px[i * 4 + 3] < 40) continue;
      inkN += 1;
      inkLum += lum(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    }
    if (inkN >= 30) {
      const mean = inkLum / inkN;
      const out = new Uint8ClampedArray(px.length);
      for (let i = 0; i < w * h; i++) {
        const a = px[i * 4 + 3];
        const p = i * 4;
        if (a < 24) continue;
        if (mean >= 170) {
          out[p] = 18;
          out[p + 1] = 18;
          out[p + 2] = 18;
          out[p + 3] = a;
        } else {
          out[p] = px[p];
          out[p + 1] = px[p + 1];
          out[p + 2] = px[p + 2];
          out[p + 3] = a;
        }
      }
      return cropAndEncode(canvas, ctx, out, w, h, original);
    }
  }

  const samples: number[] = [];
  for (const [x0, y0, x1, y1] of corners(w, h)) {
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const p = (y * w + x) * 4;
        samples.push(lum(px[p], px[p + 1], px[p + 2]));
      }
    }
  }
  const bg = median(samples);
  const alpha = new Uint16Array(w * h);
  const rgb = new Uint8ClampedArray(w * h * 3);

  if (bg >= 165) {
    const colours: Array<[number, number, number]> = [];
    for (const [x0, y0, x1, y1] of corners(w, h)) {
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const p = (y * w + x) * 4;
          colours.push([px[p], px[p + 1], px[p + 2]]);
        }
      }
    }
    colours.sort((a, b) => lum(b[0], b[1], b[2]) - lum(a[0], a[1], a[2]));
    const cut = Math.max(1, Math.floor(colours.length * 0.5));
    let pr = 0;
    let pg = 0;
    let pb = 0;
    for (let s = 0; s < cut; s++) {
      pr += colours[s][0];
      pg += colours[s][1];
      pb += colours[s][2];
    }
    pr /= cut;
    pg /= cut;
    pb /= cut;
    const paperLum = lum(pr, pg, pb);
    const paperBlueBias = Math.max(0, pb - Math.max(pr, pg));
    for (let i = 0; i < w * h; i++) {
      const p = i * 4;
      const r = px[p];
      const g = px[p + 1];
      const b = px[p + 2];
      const darkness = paperLum - lum(r, g, b);
      const dist = Math.hypot(r - pr, g - pg, b - pb);
      const blueBias = Math.max(0, b - Math.max(r, g) - paperBlueBias);
      let ink = 0;
      if (darkness > 14) ink = Math.max(ink, darkness);
      if (darkness > 12 && dist > 28) ink = Math.max(ink, dist * 0.55);
      if (darkness > 18 && blueBias > 8) ink = Math.max(ink, blueBias * 1.6 + darkness * 0.3);
      let aOut = 0;
      if (ink <= 18) aOut = 0;
      else if (ink >= 70) aOut = 255;
      else aOut = Math.round(((ink - 18) / (70 - 18)) * 255);
      if (aOut < 18) aOut = 0;
      if (aOut) {
        const factor = darkness < 80 ? 0.78 : 0.72;
        rgb[i * 3] = Math.max(0, Math.min(255, Math.round(r * factor)));
        rgb[i * 3 + 1] = Math.max(0, Math.min(255, Math.round(g * factor)));
        rgb[i * 3 + 2] = Math.max(0, Math.min(255, Math.round(b * factor)));
        alpha[i] = aOut;
      }
    }
  } else {
    for (let i = 0; i < w * h; i++) {
      const p = i * 4;
      const lightness = lum(px[p], px[p + 1], px[p + 2]) - bg;
      if (lightness <= 18) continue;
      const aOut = lightness >= 70 ? 255 : Math.round(((lightness - 18) / (70 - 18)) * 255);
      if (aOut < 18) continue;
      rgb[i * 3] = 18;
      rgb[i * 3 + 1] = 18;
      rgb[i * 3 + 2] = 18;
      alpha[i] = aOut;
    }
  }

  const keep = keepComponents(alpha, w, h);
  const out = new Uint8ClampedArray(px.length);
  for (let i = 0; i < w * h; i++) {
    if (!keep[i] || !alpha[i]) continue;
    const p = i * 4;
    out[p] = rgb[i * 3];
    out[p + 1] = rgb[i * 3 + 1];
    out[p + 2] = rgb[i * 3 + 2];
    out[p + 3] = alpha[i];
  }
  return cropAndEncode(canvas, ctx, out, w, h, original);
}
