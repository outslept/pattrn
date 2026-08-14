import { getLighterShade, getPatternColor, getContrastColor } from "./color.js";

export type Pattern = "none" | "dots" | "stripes" | "grid" | "checkers" | "noise";

export interface BuildOptions {
  width: number;
  height: number;
  background: string;
  foreground: string | null;
  radius: number;
  gradient: boolean;
  pattern: Pattern;
  patternScale: number;
  patternAngle: number;
  patternColor: "auto" | string;
  patternOpacity: number;
  text: string | null;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  shadow: boolean;
}

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function buildSvg(opts: BuildOptions): string {
  const { width, height, background, foreground, radius, gradient, shadow, text } = opts;
  const defs: string[] = [
    `<mask id="roundedMask"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/></mask>`,
  ];
  const overlays: string[] = [];

  if (gradient) {
    const lighter = getLighterShade(background);
    defs.push(
      `<linearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#${background}"/>
        <stop offset="100%" stop-color="#${lighter}"/>
      </linearGradient>`,
    );
  }

  if (shadow) {
    defs.push(
      `<filter id="softShadow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
        <feOffset dx="0" dy="1" result="ob"/>
        <feFlood flood-color="#000" flood-opacity="0.25"/>
        <feComposite in2="ob" operator="in"/>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`,
    );
  }

  const colorHex = opts.patternColor === "auto" ? getPatternColor(background) : opts.patternColor;
  const patternDef = createPatternDef(
    opts.pattern,
    opts.patternScale,
    colorHex,
    opts.patternOpacity,
    opts.patternAngle,
  );

  if (patternDef) {
    defs.push(patternDef.def);
    overlays.push(patternDef.element);
  }

  const fill = gradient ? "url(#mainGrad)" : `#${background}`;
  const textColor = foreground ? `#${foreground}` : getContrastColor(background);

  const textNode = text
    ? `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        font-family="${escapeAttr(opts.fontFamily)}" font-weight="${escapeAttr(opts.fontWeight)}"
        font-size="${opts.fontSize}" fill="${textColor}"${
          shadow ? ' filter="url(#softShadow)"' : ""
        }>${escapeText(text)}</text>`
    : "";

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img">
  <title>${escapeText(text ?? `${width}x${height}`)}</title>
  <defs>${defs.join("\n")}</defs>
  <g mask="url(#roundedMask)">
    <rect width="${width}" height="${height}" fill="${fill}"/>
    ${overlays.join("\n")}
  </g>
  ${textNode}
</svg>`;
}

function createPatternDef(
  type: Pattern,
  scale: number,
  colorHex: string,
  opacity: number,
  angle: number,
) {
  switch (type) {
    case "dots": {
      const r = Math.max(1, Math.round(scale * 0.1));
      const c = scale / 2;
      return {
        def: `<pattern id="dots" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse">
          <circle cx="${c}" cy="${c}" r="${r}" fill="#${colorHex}" opacity="${opacity}"/></pattern>`,
        element: `<rect width="100%" height="100%" fill="url(#dots)"/>`,
      };
    }
    case "stripes": {
      const stripeWidth = Math.max(1, scale / 2);
      return {
        def: `<pattern id="stripes" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">
          <rect width="${stripeWidth}" height="${scale}" fill="#${colorHex}" opacity="${opacity}"/></pattern>`,
        element: `<rect width="100%" height="100%" fill="url(#stripes)"/>`,
      };
    }
    case "grid": {
      return {
        def: `<pattern id="grid" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse">
          <path d="M${scale} 0 L0 0 0 ${scale}" fill="none" stroke="#${colorHex}" stroke-width="1" opacity="${opacity}" shape-rendering="crispEdges"/></pattern>`,
        element: `<rect width="100%" height="100%" fill="url(#grid)"/>`,
      };
    }
    case "checkers": {
      const half = scale / 2;
      return {
        def: `<pattern id="checkers" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="${half}" height="${half}" fill="#${colorHex}" opacity="${opacity}"/>
          <rect x="${half}" y="${half}" width="${half}" height="${half}" fill="#${colorHex}" opacity="${opacity}"/>
        </pattern>`,
        element: `<rect width="100%" height="100%" fill="url(#checkers)"/>`,
      };
    }
    case "noise": {
      return {
        def: `<filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" stitchTiles="stitch" result="n"/>
          <feColorMatrix in="n" type="saturate" values="0" result="m"/>
          <feComponentTransfer in="m"><feFuncA type="table" tableValues="0 ${opacity}"/></feComponentTransfer>
        </filter>`,
        element: `<rect width="100%" height="100%" filter="url(#grain)"/>`,
      };
    }
    default:
      return null;
  }
}

function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] || ch);
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/[\n\r]/g, " ");
}
