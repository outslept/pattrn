# SVG Placeholder Service

Clean URLs for crisp SVG placeholders.

```
GET /
→ "Service ready. Try /img/300x200"
```

# Routes

```
/img/:size
/img/:size/:bg
/img/:size/:bg/:fg
```

# Parameters

```
Path
- size: N or WxH (1..3000)
- bg: hex (3/6-digit, "#" optional)
- fg: hex (optional). If missing, auto-contrast is used.

Query
- radius: 0..min(w,h)/2 (default 0)
- gradient: 1|true|yes|on (default false)
- pattern: none|dots|stripes|grid|checkers|noise (default none)
- patternScale: 2..200 (default 20)
- patternAngle: number, deg (default 45)
- patternOpacity: 0..1 (default 0.15)
- patternColor: auto|hex (default auto)
- text: auto|none|<string> (default auto → "WxH")
- fontSize: 6..400 (default 24)
- fontWeight: <string> (default bold)
- font: <font-family string> (default "Arial, Helvetica, sans-serif")
- shadow: 1|true|yes|on (default true)
```

# Examples

```
/img/300x200
/img/600
/img/600/333/fff
/img/400x300/09f?radius=24&gradient=1
/img/800x400/222?pattern=stripes&patternScale=24&patternAngle=30
/img/500x300/555?pattern=dots&patternColor=999
/img/320x180/333?pattern=noise&patternOpacity=0.2
/img/400x300/333/eee?text=none
/img/640x360/111/fff?text=Preview&fontSize=32
```

# Response

```
Content-Type: image/svg+xml; charset=utf-8
Cache-Control: public, max-age=86400
```

# Errors

```
400 Invalid size. Use N or WxH.
400 Invalid width (1..3000)
400 Invalid height (1..3000)
400 Invalid background color
400 Invalid foreground color
400 Unsupported pattern
400 Invalid patternColor
500 Internal Server Error
```

# Anatomy

- Path vs query: size/bg/fg are in the path so the URL itself is the identity — great for cache keys, shareable links, and quick eyeballing. All “styling tweaks” live in the query string.
- Colors: 3/6 hex with optional # keeps input short; values are normalized server-side.
- Auto-contrast text: if fg is omitted, the service picks a readable text color (#111111 or #eeeeee) from bg luminance.
- Subtle by default: gradient is off and patternOpacity is low (0.15) to keep placeholders understated. Turn knobs only when you need them.
- patternColor=auto: computes a contrasting shade from the background (dark on light, light on dark) so overlays work on any bg without trial and error.
- Strict but friendly ranges: size 1..3000 and clamped controls (radius, patternScale, opacity) guard CPU/memory across arbitrary inputs while still being flexible.
- radius via mask: rounded corners clip everything (bg, gradient, patterns, noise) consistently instead of faking it per-layer.
- Boolean ergonomics: accepts 1/true/yes/on so links, curl, and UI toggles all feel natural.
