import { Hono, type Context } from 'hono'
import { serve } from '@hono/node-server'
import 'dotenv/config'
import { buildSvg, type Pattern } from './svg.js'
import { normalizeHex } from './color.js'

const app = new Hono()

app.get('/', (c) => c.html('Service ready. Try /img/300x200'))

app.get('/img/:size', handle)
app.get('/img/:size/:bg', handle)
app.get('/img/:size/:bg/:fg', handle)

async function handle(c: Context) {
  try {
    const { size = '', bg: bgRaw, fg: fgRaw } = c.req.param()

    const dims = parseSize(size)
    if (!dims) return c.text('Invalid size. Use N or WxH.', 400)
    const { width, height } = dims

    if (width < 1 || width > 3000) return c.text('Invalid width (1..3000)', 400)
    if (height < 1 || height > 3000) return c.text('Invalid height (1..3000)', 400)

    const bg = normalizeHex(bgRaw || '333333')
    if (!bg) return c.text('Invalid background color', 400)

    const fg = fgRaw ? normalizeHex(fgRaw) : null
    if (fgRaw && !fg) return c.text('Invalid foreground color', 400)

    const maxRadius = Math.floor(Math.min(width, height) / 2)
    const radius = safeInt(c.req.query('radius'), 0, 0, maxRadius)
    const gradient = toBool(c.req.query('gradient') ?? 'false')

    const patternName = (c.req.query('pattern') ?? 'none').toLowerCase()
    const pattern = parsePattern(patternName)
    if (!pattern) return c.text('Unsupported pattern', 400)

    const patternScale = safeInt(c.req.query('patternScale'), 20, 2, 200)
    const patternAngle = safeFloat(c.req.query('patternAngle'), 45, -360, 360)
    const patternOpacity = safeFloat(c.req.query('patternOpacity'), 0.15, 0, 1)

    const patternColorParam = (c.req.query('patternColor') ?? 'auto').toLowerCase()
    let patternColor: 'auto' | string = 'auto'
    if (patternColorParam !== 'auto') {
      const normalized = normalizeHex(patternColorParam)
      if (!normalized) return c.text('Invalid patternColor', 400)
      patternColor = normalized
    }

    const textParam = c.req.query('text')
    let text: string | null = `${width}x${height}`
    if (textParam === 'none') {
      text = null
    } else if (textParam && textParam !== 'auto') {
      text = textParam
    }

    const fontSize = safeInt(c.req.query('fontSize'), 24, 6, 400)
    const fontWeight = c.req.query('fontWeight') ?? 'bold'
    const fontFamily = c.req.query('font') ?? 'Arial, Helvetica, sans-serif'
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
      patternColor,
      patternOpacity,
      text,
      fontFamily,
      fontSize,
      fontWeight,
      shadow,
    })

    const isDev = process.env.NODE_ENV === 'development' || process.env.ENVIRONMENT === 'DEV'
    c.header('Content-Type', 'image/svg+xml; charset=utf-8')
    c.header('Cache-Control', isDev ? 'no-cache' : 'public, max-age=86400')
    return c.body(svg)
  } catch (err) {
    console.error(err)
    return c.text('Internal Server Error', 500)
  }
}

function safeInt(val: string | undefined, fallback: number, min: number, max: number): number {
  if (!val) return fallback
  const parsed = parseInt(val, 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function safeFloat(val: string | undefined, fallback: number, min: number, max: number): number {
  if (!val) return fallback
  const parsed = parseFloat(val)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function parseSize(s: string): { width: number; height: number } | null {
  if (!/^\d+(?:x\d+)?$/i.test(s)) return null
  const parts = s.toLowerCase().split('x')
  const rawW = parts[0]
  if (!rawW) return null
  const rawH = parts[1] ?? rawW
  const w = parseInt(rawW, 10)
  const h = parseInt(rawH, 10)
  if (Number.isNaN(w) || Number.isNaN(h)) return null
  return { width: w, height: h }
}

function parsePattern(s: string): Pattern | null {
  const validPatterns: Pattern[] = ['none', 'dots', 'stripes', 'grid', 'checkers', 'noise']
  return validPatterns.includes(s as Pattern) ? (s as Pattern) : null
}

function toBool(v: string): boolean {
  return /^(1|true|yes|on)$/i.test(v)
}

const port = safeInt(process.env.PORT, 8080, 1, 65535)
serve({ fetch: app.fetch, port })

export default app
