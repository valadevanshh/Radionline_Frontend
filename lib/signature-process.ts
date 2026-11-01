/**
 * Strip paper / photo background from a signature image so it composites cleanly
 * on reports (transparent PNG). Handles plain signatures and stamp-style uploads
 * (signature + printed name/degree). Mirrors backend app/signature_image.py.
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
  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;

  const samples: Array<[number, number, number]> = [];
  const corners: Array<[number, number, number, number]> = [
    [0, 0, Math.min(80, w), Math.min(80, h)],
    [Math.max(0, w - 80), 0, w, Math.min(80, h)],
    [0, Math.max(0, h - 80), Math.min(80, w), h],
    [Math.max(0, w - 80), Math.max(0, h - 80), w, h],
  ];
  for (const [x0, y0, x1, y1] of corners) {
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const i = (y * w + x) * 4;
        samples.push([px[i], px[i + 1], px[i + 2]]);
      }
    }
  }
  samples.sort((a, b) => lum(b[0], b[1], b[2]) - lum(a[0], a[1], a[2]));
  const cut = Math.max(1, Math.floor(samples.length * 0.5));
  let pr = 0;
  let pg = 0;
  let pb = 0;
  for (let s = 0; s < cut; s++) {
    pr += samples[s][0];
    pg += samples[s][1];
    pb += samples[s][2];
  }
  pr /= cut;
  pg /= cut;
  pb /= cut;
  const paperLum = lum(pr, pg, pb);
  const paperBlueBias = Math.max(0, pb - Math.max(pr, pg));

  const alpha = new Uint8Array(w * h);
  const rgb = new Uint8ClampedArray(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
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
  }

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
      const cur = stack.pop()!;
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
    if (comp.length >= 25) {
      for (const c of comp) keep[c] = 1;
    }
  }

  let minx = w;
  let miny = h;
  let maxx = 0;
  let maxy = 0;
  let inkCount = 0;
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    if (keep[i] && alpha[i]) {
      px[p] = rgb[i * 3];
      px[p + 1] = rgb[i * 3 + 1];
      px[p + 2] = rgb[i * 3 + 2];
      px[p + 3] = alpha[i];
      inkCount += 1;
      // Crop from solid ink only — soft haze must not inflate the box
      if (alpha[i] >= 48) {
        const x = i % w;
        const y = (i / w) | 0;
        if (x < minx) minx = x;
        if (y < miny) miny = y;
        if (x > maxx) maxx = x;
        if (y > maxy) maxy = y;
      }
    } else {
      px[p] = 0;
      px[p + 1] = 0;
      px[p + 2] = 0;
      px[p + 3] = 0;
    }
  }

  if (inkCount < 30) {
    return canvas.toDataURL('image/png');
  }

  ctx.putImageData(imageData, 0, 0);
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
