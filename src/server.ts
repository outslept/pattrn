import { Hono, type Context } from "hono";
import { serve } from "@hono/node-server";
import "dotenv/config";
import { buildSvg, type Pattern } from "./svg.js";
import { normalizeHex } from "./color.js";

const app = new Hono();
const IS_DEV = process.env.NODE_ENV === "development" || process.env.ENVIRONMENT === "DEV";
const VALID_PATTERNS = new Set<string>(["none", "dots", "stripes", "grid", "checkers", "noise"]);

app.get("/", (c) => c.html("Service ready. Try /img/300x200"));
app.get("/img/:size/:bg?/:fg?", handle);

async function handle(c: Context) {
  try {
    const { size = "", bg: bgRaw, fg: fgRaw } = c.req.param();

    const dims = parseSize(size);
    if (!dims) return c.text("Invalid size. Use N or WxH.", 400);
    const { width, height } = dims;

    if (width < 1 || width > 3000) return c.text("Invalid width (1..3000)", 400);
    if (height < 1 || height > 3000) return c.text("Invalid height (1..3000)", 400);

    const bg = normalizeHex(bgRaw || "333333");
    if (!bg) return c.text("Invalid background color", 400);

    const fg = fgRaw ? normalizeHex(fgRaw) : null;
    if (fgRaw && !fg) return c.text("Invalid foreground color", 400);

    const maxRadius = Math.floor(Math.min(width, height) / 2);
    const radius = parseBoundedNumber(c.req.query("radius"), 0, 0, maxRadius, parseInt);
    const gradient = toBool(c.req.query("gradient") ?? "false");

    const patternName = (c.req.query("pattern") ?? "none").toLowerCase();
    if (!VALID_PATTERNS.has(patternName)) return c.text("Unsupported pattern", 400);

    const patternScale = parseBoundedNumber(c.req.query("patternScale"), 20, 2, 200, parseInt);
    const patternAngle = parseBoundedNumber(c.req.query("patternAngle"), 45, -360, 360, parseFloat);
    const patternOpacity = parseBoundedNumber(
      c.req.query("patternOpacity"),
      0.15,
      0,
      1,
      parseFloat,
    );

    const patternColorParam = (c.req.query("patternColor") ?? "auto").toLowerCase();
    let patternColor: "auto" | string = "auto";
    if (patternColorParam !== "auto") {
      const normalized = normalizeHex(patternColorParam);
      if (!normalized) return c.text("Invalid patternColor", 400);
      patternColor = normalized;
    }

    const textParam = c.req.query("text");
    const text =
      textParam === "none"
        ? null
        : !textParam || textParam === "auto"
          ? `${width}x${height}`
          : textParam;

    const fontSize = parseBoundedNumber(c.req.query("fontSize"), 24, 6, 400, parseInt);
    const fontWeight = c.req.query("fontWeight") ?? "bold";
    const fontFamily = c.req.query("font") ?? "Arial, Helvetica, sans-serif";
    const shadow = toBool(c.req.query("shadow") ?? "true");

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
      text,
      fontFamily,
      fontSize,
      fontWeight,
      shadow,
    });

    c.header("Content-Type", "image/svg+xml; charset=utf-8");
    c.header("Cache-Control", IS_DEV ? "no-cache" : "public, max-age=86400");
    return c.body(svg);
  } catch (err) {
    console.error(err);
    return c.text("Internal Server Error", 500);
  }
}

function parseBoundedNumber(
  val: string | undefined,
  fallback: number,
  min: number,
  max: number,
  parser: (s: string, radix?: number) => number,
): number {
  if (!val) return fallback;
  const parsed = parser(val, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function parseSize(s: string): { width: number; height: number } | null {
  if (!/^\d+(?:x\d+)?$/i.test(s)) return null;
  const parts = s.toLowerCase().split("x");
  const rawW = parts[0];
  if (!rawW) return null;
  const w = parseInt(rawW, 10);
  const h = parseInt(parts[1] ?? rawW, 10);
  if (Number.isNaN(w) || Number.isNaN(h)) return null;
  return { width: w, height: h };
}

function toBool(v: string): boolean {
  return /^(1|true|yes|on)$/i.test(v);
}

const port = parseBoundedNumber(process.env.PORT, 8080, 1, 65535, parseInt);
serve({ fetch: app.fetch, port });

export default app;
