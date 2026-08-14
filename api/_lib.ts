const LOOKUP_HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))

export function normalizeHex(input: string): string | null {
  const s = input.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(s)) return s.replace(/./g, '$&$&')
  if (/^[0-9a-f]{6}$/.test(s)) return s
  return null
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const num = parseInt(hex, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const cr = Math.min(255, Math.max(0, Math.round(r)))
  const cg = Math.min(255, Math.max(0, Math.round(g)))
  const cb = Math.min(255, Math.max(0, Math.round(b)))
  return `${LOOKUP_HEX[cr]}${LOOKUP_HEX[cg]}${LOOKUP_HEX[cb]}`
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break
    case g: h = (b - r) / d + 2; break
    case b: h = (r - g) / d + 4; break
  }
  return { h: h / 6, s, l }
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255
  }
}

export function getLighterShade(hex: string, amount = 0.25): string {
  const { r, g, b } = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  const newL = Math.min(1, l < 0.05 ? l + amount : l + (1 - l) * amount)
  const res = hslToRgb(h, s, newL)
  return rgbToHex(res.r, res.g, res.b)
}

export function getPatternColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  const newL = l > 0.5 ? Math.max(0, l - 0.25) : Math.min(1, l + 0.25)
  const res = hslToRgb(h, s, newL)
  return rgbToHex(res.r, res.g, res.b)
}

export function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#111111' : '#eeeeee'
}

export type Pattern = 'none' | 'dots' | 'stripes' | 'grid' | 'checkers' | 'noise'

export interface BuildOptions {
  width: number
  height: number
  background: string
  foreground: string | null
  radius: number
  gradient: boolean
  pattern: Pattern
  patternScale: number
  patternAngle: number
  patternColor: 'auto' | string
  patternOpacity: number
  text: string | null
  fontFamily: string
  fontSize: number
  fontWeight: string
  shadow: boolean
}

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] || ch)
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/[\n\r]/g, ' ')
}

export function buildSvg(opts: BuildOptions): string {
  const { width, height, background, foreground, radius, gradient, shadow, text } = opts
  const defs: string[] = [
    `<mask id="roundedMask"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/></mask>`
  ]
  const overlays: string[] = []

  if (gradient) {
    const lighter = getLighterShade(background)
    defs.push(
      `<linearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#${background}"/>
        <stop offset="100%" stop-color="#${lighter}"/>
      </linearGradient>`
    )
  }

  if (shadow) {
    defs.push(
      `<filter id="softShadow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
        <feOffset dx="0" dy="1" result="ob"/>
        <feFlood flood-color="#000" flood-opacity="0.25"/>
        <feComposite in2="ob" operator="in"/>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`
    )
  }

  const colorHex = opts.patternColor === 'auto' ? getPatternColor(background) : opts.patternColor
  const patternDef = createPatternDef(opts.pattern, opts.patternScale, colorHex, opts.patternOpacity, opts.patternAngle)

  if (patternDef) {
    defs.push(patternDef.def)
    overlays.push(patternDef.element)
  }

  const fill = gradient ? 'url(#mainGrad)' : `#${background}`
  const textColor = foreground ? `#${foreground}` : getContrastColor(background)

  const textNode = text
    ? `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        font-family="${escapeAttr(opts.fontFamily)}" font-weight="${escapeAttr(opts.fontWeight)}"
        font-size="${opts.fontSize}" fill="${textColor}"${shadow ? ' filter="url(#softShadow)"' : ''
    }>${escapeText(text)}</text>`
    : ''

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img">
  <title>${escapeText(text ?? `${width}x${height}`)}</title>
  <defs>${defs.join('\n')}</defs>
  <g mask="url(#roundedMask)">
    <rect width="${width}" height="${height}" fill="${fill}"/>
    ${overlays.join('\n')}
  </g>
  ${textNode}
</svg>`
}

function createPatternDef(type: Pattern, scale: number, colorHex: string, opacity: number, angle: number) {
  switch (type) {
    case 'dots': {
      const r = Math.max(1, Math.round(scale * 0.1))
      const c = scale / 2
      return {
        def: `<pattern id="dots" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse">
          <circle cx="${c}" cy="${c}" r="${r}" fill="#${colorHex}" opacity="${opacity}"/></pattern>`,
        element: `<rect width="100%" height="100%" fill="url(#dots)"/>`
      }
    }
    case 'stripes': {
      const stripeWidth = Math.max(1, scale / 2)
      return {
        def: `<pattern id="stripes" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">
          <rect width="${stripeWidth}" height="${scale}" fill="#${colorHex}" opacity="${opacity}"/></pattern>`,
        element: `<rect width="100%" height="100%" fill="url(#stripes)"/>`
      }
    }
    case 'grid': {
      return {
        def: `<pattern id="grid" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse">
          <path d="M${scale} 0 L0 0 0 ${scale}" fill="none" stroke="#${colorHex}" stroke-width="1" opacity="${opacity}" shape-rendering="crispEdges"/></pattern>`,
        element: `<rect width="100%" height="100%" fill="url(#grid)"/>`
      }
    }
    case 'checkers': {
      const half = scale / 2
      return {
        def: `<pattern id="checkers" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="${half}" height="${half}" fill="#${colorHex}" opacity="${opacity}"/>
          <rect x="${half}" y="${half}" width="${half}" height="${half}" fill="#${colorHex}" opacity="${opacity}"/>
        </pattern>`,
        element: `<rect width="100%" height="100%" fill="url(#checkers)"/>`
      }
    }
    case 'noise': {
      return {
        def: `<filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" stitchTiles="stitch" result="n"/>
          <feColorMatrix in="n" type="saturate" values="0" result="m"/>
          <feComponentTransfer in="m"><feFuncA type="table" tableValues="0 ${opacity}"/></feComponentTransfer>
        </filter>`,
        element: `<rect width="100%" height="100%" filter="url(#grain)"/>`
      }
    }
    default:
      return null
  }
}

export function parseBoundedNumber(
  val: string | undefined,
  fallback: number,
  min: number,
  max: number,
  parser: (s: string, radix?: number) => number
): number {
  if (!val) return fallback
  const parsed = parser(val, 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

export function parseSize(s: string): { width: number; height: number } | null {
  if (!/^\d+(?:x\d+)?$/i.test(s)) return null
  const parts = s.toLowerCase().split('x')
  const rawW = parts[0]
  if (!rawW) return null
  const w = parseInt(rawW, 10)
  const h = parseInt(parts[1] ?? rawW, 10)
  if (Number.isNaN(w) || Number.isNaN(h)) return null
  return { width: w, height: h }
}

export function toBool(v: string): boolean {
  return /^(1|true|yes|on)$/i.test(v)
}
