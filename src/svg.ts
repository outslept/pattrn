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

export function buildSvg (opts: BuildOptions): string {
  const { width: w, height: h } = opts
  const lighter = opts.gradient ? getMediumLighterShade(opts.background) : opts.background

  const defs: string[] = []
  if (opts.gradient) {
    defs.push(
      `<linearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#${opts.background}"/>
        <stop offset="100%" stop-color="#${lighter}"/>
      </linearGradient>`
    )
  }
  if (opts.shadow) {
    defs.push(
      `<filter id="softShadow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
        <feOffset dx="0" dy="1" result="ob"/>
        <feFlood flood-color="#000" flood-opacity="0.2"/>
        <feComposite in2="ob" operator="in"/>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`
    )
  }
  defs.push(
    `<mask id="roundedMask"><rect width="${w}" height="${h}" rx="${opts.radius}" ry="${opts.radius}" fill="white"/></mask>`
  )

  const overlays: string[] = []
  const overlayColor =
    opts.patternColor === 'auto' ? getSlightlyDarkerShade(opts.background) : opts.patternColor

  if (opts.pattern === 'dots') {
    defs.push(dotsPattern(opts.patternScale, overlayColor, opts.patternOpacity))
    overlays.push(`<rect width="${w}" height="${h}" fill="url(#dots)"/>`)
  } else if (opts.pattern === 'stripes') {
    defs.push(stripesPattern(opts.patternScale, overlayColor, opts.patternOpacity, opts.patternAngle))
    overlays.push(`<rect width="${w}" height="${h}" fill="url(#stripes)"/>`)
  } else if (opts.pattern === 'grid') {
    defs.push(gridPattern(opts.patternScale, overlayColor, opts.patternOpacity))
    overlays.push(`<rect width="${w}" height="${h}" fill="url(#grid)"/>`)
  } else if (opts.pattern === 'checkers') {
    defs.push(checkersPattern(opts.patternScale, overlayColor, opts.patternOpacity))
    overlays.push(`<rect width="${w}" height="${h}" fill="url(#checkers)"/>`)
  } else if (opts.pattern === 'noise') {
    defs.push(noiseFilter(opts.patternOpacity))
    overlays.push(`<rect width="${w}" height="${h}" filter="url(#grain)"/>`)
  }

  const fill = opts.gradient ? 'url(#mainGrad)' : `#${opts.background}`
  const textColor = opts.foreground ? `#${opts.foreground}` : getContrastColor(opts.background)
  const textNode =
    opts.text && textColor
      ? `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
           font-family="${escapeAttr(opts.fontFamily)}" font-weight="${escapeAttr(opts.fontWeight)}"
           font-size="${opts.fontSize}" fill="${textColor}"${
          opts.shadow ? ' filter="url(#softShadow)"' : ''
        }>${escapeText(opts.text)}</text>`
      : ''

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img">
  <title>${escapeText(opts.text ?? `${w}x${h}`)}</title>
  <defs>${defs.join('')}</defs>
  <g mask="url(#roundedMask)">
    <rect width="${w}" height="${h}" fill="${fill}"/>
    ${overlays.join('\n    ')}
  </g>
  ${textNode}
</svg>`
}

export function normalizeHex (input: string): string | null {
  const s = input.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(s)) return s.split('').map((ch) => ch + ch).join('')
  if (/^[0-9a-f]{6}$/.test(s)) return s
  return null
}

function hexToRgb (hex: string) {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return { r, g, b }
}

function toHex (r: number, g: number, b: number) {
  return [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')
}

function brightness ({ r, g, b }: { r: number; g: number; b: number }) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function getMediumLighterShade (hex: string) {
  const rgb = hexToRgb(hex)
  const br = brightness(rgb)
  let f = 0.8
  if (br < 10) f = 60
  else if (br < 30) f = 3
  else if (br < 60) f = 2
  else if (br < 100) f = 1.75
  else if (br < 150) f = 1.5
  return toHex(rgb.r * f, rgb.g * f, rgb.b * f)
}

function getSlightlyDarkerShade (hex: string) {
  const rgb = hexToRgb(hex)
  const br = brightness(rgb)
  const f = br < 80 ? 1.8 : 0.55
  return toHex(rgb.r * f, rgb.g * f, rgb.b * f)
}

function getContrastColor (hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.5 ? '#111111' : '#eeeeee'
}

function escapeText (s: string) {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return ch
    }
  })
}

function escapeAttr (s: string) {
  return escapeText(s).replace(/[\n\r]/g, ' ')
}

function clamp (n: number, a: number, b: number) {
  return Math.min(Math.max(n, a), b)
}

function dotsPattern (size: number, colorHex: string, opacity: number) {
  const r = Math.max(1, Math.round(size * 0.08))
  const c = Math.round(size / 2)
  return `<pattern id="dots" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
    <circle cx="${c}" cy="${c}" r="${r}" fill="#${colorHex}" opacity="${opacity}"/></pattern>`
}

function stripesPattern (size: number, colorHex: string, opacity: number, rotateDeg: number) {
  const w = Math.max(1, Math.round(size / 2))
  return `<pattern id="stripes" width="${size}" height="${size}" patternUnits="userSpaceOnUse"
    patternTransform="rotate(${rotateDeg})">
    <rect width="${w}" height="${size}" fill="#${colorHex}" opacity="${opacity}"/></pattern>`
}

function gridPattern (size: number, colorHex: string, opacity: number) {
  const s = Math.max(2, size)
  return `<pattern id="grid" width="${s}" height="${s}" patternUnits="userSpaceOnUse">
    <path d="M${s} 0 L0 0 0 ${s}" fill="none" stroke="#${colorHex}" stroke-width="1"
      opacity="${opacity}" shape-rendering="crispEdges"/></pattern>`
}

function checkersPattern (size: number, colorHex: string, opacity: number) {
  const half = Math.max(1, Math.floor(size / 2))
  return `<pattern id="checkers" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
    <rect x="0" y="0" width="${half}" height="${half}" fill="#${colorHex}" opacity="${opacity}"/>
    <rect x="${half}" y="${half}" width="${size - half}" height="${size - half}" fill="#${colorHex}" opacity="${opacity}"/>
  </pattern>`
}

function noiseFilter (opacity: number) {
  const o = clamp(opacity, 0, 1)
  return `<filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" stitchTiles="stitch" result="n"/>
    <feColorMatrix in="n" type="saturate" values="0" result="m"/>
    <feComponentTransfer in="m"><feFuncA type="table" tableValues="0 ${o}"/></feComponentTransfer>
  </filter>`
}
