# svg placeholder service

## routes

```
/img/:size
/img/:size/:bg
/img/:size/:bg/:fg
```

## parameters

path:
- size: n or wxh (1..3000)
- bg: hex (3/6-digit, "#" optional)
- fg: hex (optional). if missing, auto-contrast is used.

query:
- radius: 0..min(w,h)/2 (default 0)
- gradient: 1|true|yes|on (default false)
- pattern: none|dots|stripes|grid|checkers|noise (default none)
- patternScale: 2..200 (default 20)
- patternAngle: number, deg (default 45)
- patternOpacity: 0..1 (default 0.15)
- patternColor: auto|hex (default auto)
- text: auto|none|<string> (default auto)
- fontSize: 6..400 (default 24)
- fontWeight: <string> (default bold)
- font: <font-family string> (default "arial, helvetica, sans-serif")
- shadow: 1|true|yes|on (default true)
