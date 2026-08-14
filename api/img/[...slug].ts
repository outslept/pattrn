import {
  buildSvg,
  normalizeHex,
  parseBoundedNumber,
  parseSize,
  toBool,
  type Pattern
} from '../_lib.js'

const VALID_PATTERNS = new Set<string>(['none', 'dots', 'stripes', 'grid', 'checkers', 'noise'])
const IS_DEV = process.env.NODE_ENV === 'development' || process.env.ENVIRONMENT === 'DEV'

const text = (message: string, status: number) => new Response(message, {
  status,
  headers: { 'Content-Type': 'text/plain; charset=utf-8' }
})

export default (request: Request): Response => {
  const url = new URL(request.url)
  const segments = url.pathname.split('/').filter(Boolean)
  // /api/img/... -> segments: ['api','img',...]
  const parts = segments.slice(2)
  const size = parts[0] || ''
  const bgRaw = parts[1]
  const fgRaw = parts[2]

  const dims = parseSize(size)
  if (!dims) return text('Invalid size. Use N or WxH.', 400)
  const { width, height } = dims

  if (width < 1 || width > 3000) return text('Invalid width (1..3000)', 400)
  if (height < 1 || height > 3000) return text('Invalid height (1..3000)', 400)

  const bg = normalizeHex(bgRaw || '333333')
  if (!bg) return text('Invalid background color', 400)

  const fg = fgRaw ? normalizeHex(fgRaw) : null
  if (fgRaw && !fg) return text('Invalid foreground color', 400)

  const q = url.searchParams
  const maxRadius = Math.floor(Math.min(width, height) / 2)
  const radius = parseBoundedNumber(q.get('radius') || undefined, 0, 0, maxRadius, parseInt)
  const gradient = toBool(q.get('gradient') ?? 'false')

  const patternName = (q.get('pattern') ?? 'none').toLowerCase()
  if (!VALID_PATTERNS.has(patternName)) return text('Unsupported pattern', 400)

  const patternScale = parseBoundedNumber(q.get('patternScale') || undefined, 20, 2, 200, parseInt)
  const patternAngle = parseBoundedNumber(q.get('patternAngle') || undefined, 45, -360, 360, parseFloat)
  const patternOpacity = parseBoundedNumber(q.get('patternOpacity') || undefined, 0.15, 0, 1, parseFloat)

  const patternColorParam = (q.get('patternColor') ?? 'auto').toLowerCase()
  let patternColor: 'auto' | string = 'auto'
  if (patternColorParam !== 'auto') {
    const normalized = normalizeHex(patternColorParam)
    if (!normalized) return text('Invalid patternColor', 400)
    patternColor = normalized
  }

  const textParam = q.get('text')
  const textValue = textParam === 'none' ? null : (!textParam || textParam === 'auto') ? `${width}x${height}` : textParam

  const fontSize = parseBoundedNumber(q.get('fontSize') || undefined, 24, 6, 400, parseInt)
  const fontWeight = q.get('fontWeight') ?? 'bold'
  const fontFamily = q.get('font') ?? 'Arial, Helvetica, sans-serif'
  const shadow = toBool(q.get('shadow') ?? 'true')

  const svg = buildSvg({
    width,
    height,
    background: bg,
    foreground: fg,
    radius,
    gradient,
    pattern: patternName as Pattern,
    patternScale,
    patternAngle,
    patternColor,
    patternOpacity,
    text: textValue,
    fontFamily,
    fontSize,
    fontWeight,
    shadow,
  })

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': IS_DEV ? 'no-cache' : 'public, max-age=86400'
    }
  })
}
