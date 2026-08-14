const LOOKUP_HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

export function normalizeHex(input: string): string | null {
  const s = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) return s.replace(/./g, "$&$&");
  if (/^[0-9a-f]{6}$/.test(s)) return s;
  return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const num = parseInt(hex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const cr = Math.min(255, Math.max(0, Math.round(r)));
  const cg = Math.min(255, Math.max(0, Math.round(g)));
  const cb = Math.min(255, Math.max(0, Math.round(b)));
  return `${LOOKUP_HEX[cr]}${LOOKUP_HEX[cg]}${LOOKUP_HEX[cb]}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    case b:
      h = (r - g) / d + 4;
      break;
  }
  return { h: h / 6, s, l };
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

export function getLighterShade(hex: string, amount = 0.25): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const newL = Math.min(1, l < 0.05 ? l + amount : l + (1 - l) * amount);
  const res = hslToRgb(h, s, newL);
  return rgbToHex(res.r, res.g, res.b);
}

export function getPatternColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const newL = l > 0.5 ? Math.max(0, l - 0.25) : Math.min(1, l + 0.25);
  const res = hslToRgb(h, s, newL);
  return rgbToHex(res.r, res.g, res.b);
}

export function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? "#111111" : "#eeeeee";
}
