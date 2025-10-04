import { Hono, type Context } from 'hono'
import { serve } from '@hono/node-server'
import 'dotenv/config'
import { buildSvg, normalizeHex, type Pattern } from './svg.js'

const app = new Hono()

app.get('/', (c) => c.html('Service ready. Try /img/300x200'))

app.get('/img/:size', handle)
app.get('/img/:size/:bg', handle)
app.get('/img/:size/:bg/:fg', handle)

async function handle (c: Context) {
  try {
    const { size = '', bg: bgRaw, fg: fgRaw } = c.req.param()
    const dims = parseSize(size)
    if (!dims) return c.text('Invalid size. Use N or WxH.', 400)

    const { width, height } = dims
    if (!inRange(width, 1, 3000)) return c.text('Invalid width (1..3000)', 400)
    if (!inRange(height, 1, 3000)) return c.text('Invalid height (1..3000)', 400)

    const bg = normalizeHex(bgRaw || '333333')
    if (!bg) return c.text('Invalid background color', 400)

    const fg = fgRaw ? normalizeHex(fgRaw) : null
    if (fgRaw && !fg) return c.text('Invalid foreground color', 400)

    const radius = clamp(toInt(c.req.query('radius') ?? '0'), 0, Math.floor(Math.min(width, height) / 2))
    const gradient = toBool(c.req.query('gradient') ?? 'false')

    const patternName = (c.req.query('pattern') ?? 'none').toLowerCase()
    const pattern = parsePattern(patternName)
    if (!pattern) return c.text('Unsupported pattern', 400)

    const patternScale = clamp(toInt(c.req.query('patternScale') ?? '20'), 2, 200)
    const patternAngle = Number(c.req.query('patternAngle') ?? '45')
    const patternOpacity = clamp(Number(c.req.query('patternOpacity') ?? '0.15'), 0, 1)

    const patternColorParam = (c.req.query('patternColor') ?? 'auto').toLowerCase()
    const patternColor = patternColorParam === 'auto' ? 'auto' : normalizeHex(patternColorParam)
    if (patternColorParam !== 'auto' && !patternColor) return c.text('Invalid patternColor', 400)

    const textParam = c.req.query('text')
    const text = textParam === 'none' ? null : !textParam || textParam === 'auto' ? `${width}x${height}` : String(textParam)

    const fontSize = clamp(toInt(c.req.query('fontSize') ?? '24'), 6, 400)
    const fontWeight = String(c.req.query('fontWeight') ?? 'bold')
    const fontFamily = String(c.req.query('font') ?? 'Arial, Helvetica, sans-serif')
    const shadow = toBool(c.req.query('shadow') ?? 'true')

    const svg = buildSvg({
      width,
      height,
      background: bg,
      foreground: fg,
      radius,
      gradient,
      pattern,
      patternScale,
      patternAngle,
      patternColor: (patternColor ?? 'auto') as 'auto' | string,
      patternOpacity,
      text,
      fontFamily,
      fontSize,
      fontWeight,
      shadow,
    })

    const isDev = (process.env.NODE_ENV || '').toLowerCase() === 'development' || process.env.ENVIRONMENT === 'DEV'
    c.header('Content-Type', 'image/svg+xml; charset=utf-8')
    c.header('Cache-Control', isDev ? 'no-cache' : 'public, max-age=86400')
    return c.body(svg)
  } catch (err) {
    console.error(err)
    return c.text('Internal Server Error', 500)
  }
}

function parseSize (s: string): { width: number; height: number } | null {
  if (!/^\d+(?:x\d+)?$/i.test(s)) return null
  const parts = s.toLowerCase().split('x')
  const a = parts[0]
  const b = parts[1] || parts[0]
  if (!a || !b) return null
  const w = Number.parseInt(a, 10)
  const h = Number.parseInt(b, 10)
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null
  return { width: w, height: h }
}

function parsePattern (s: string): Pattern | null {
  switch (s) {
    case 'none':
    case 'dots':
    case 'stripes':
    case 'grid':
    case 'checkers':
    case 'noise':
      return s
    default:
      return null
  }
}

const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b)
const toInt = (s: string) => parseInt(s, 10)
const inRange = (n: number, a: number, b: number) => Number.isFinite(n) && n >= a && n <= b
const toBool = (v: string) => /^(1|true|yes|on)$/i.test(v)

const port = Number(process.env.PORT || 8080)
serve({ fetch: app.fetch, port }, () => {
  console.log(`Hono server listening on :${port}`)
})
