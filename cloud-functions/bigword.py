"""
Python Cloud Function - BigWord Edge Renderer
bigword.py → POST /bigword

Edge-side ASCII-art generator: builds the target text from an embedded 5x7
bitmap font, then fills the "on" pixels with characters cycled from the
source text. Zero external dependencies — pure standard-library Python,
runs on EdgeOne edge nodes close to the user.

Request (JSON):
    { "source": "Hello", "target": "HI", "cols": 110 }

Response (JSON):
    { "art": "...", "rows": N, "cols": M, "chars": K,
      "generatedAt": 1700000000.0, "runtime": "python@edge" }
"""
import json
import time
from http.server import BaseHTTPRequestHandler


# ============================================================
# Embedded 5x7 bitmap font (public-domain style).
# Each glyph = 7 rows of 5 columns. '1' = on, '0' = off.
# Tokens SP / QUO / APO avoid ambiguity in the data block.
# ============================================================

FONT_DATA = """
SP
00000
00000
00000
00000
00000
00000
00000
A
01110
10001
10001
11111
10001
10001
10001
B
11110
10001
10001
11110
10001
10001
11110
C
01110
10001
10000
10000
10000
10001
01110
D
11110
10001
10001
10001
10001
10001
11110
E
11111
10000
10000
11110
10000
10000
11111
F
11111
10000
10000
11110
10000
10000
10000
G
01110
10001
10000
10111
10001
10001
01110
H
10001
10001
10001
11111
10001
10001
10001
I
01110
00100
00100
00100
00100
00100
01110
J
00111
00010
00010
00010
00010
10010
01100
K
10001
10010
10100
11000
10100
10010
10001
L
10000
10000
10000
10000
10000
10000
11111
M
10001
11011
10101
10001
10001
10001
10001
N
10001
11001
10101
10011
10001
10001
10001
O
01110
10001
10001
10001
10001
10001
01110
P
11110
10001
10001
11110
10000
10000
10000
Q
01110
10001
10001
10001
10101
10010
01101
R
11110
10001
10001
11110
10100
10010
10001
S
01111
10000
10000
01110
00001
00001
11110
T
11111
00100
00100
00100
00100
00100
00100
U
10001
10001
10001
10001
10001
10001
01110
V
10001
10001
10001
10001
10001
01010
00100
W
10001
10001
10001
10001
10101
11011
10001
X
10001
10001
01010
00100
01010
10001
10001
Y
10001
10001
01010
00100
00100
00100
00100
Z
11111
00001
00010
00100
01000
10000
11111
0
01110
10001
10011
10101
11001
10001
01110
1
00100
01100
00100
00100
00100
00100
01110
2
01110
10001
00001
00010
00100
01000
11111
3
11110
00001
00001
01110
00001
00001
11110
4
00010
00110
01010
10010
11111
00010
00010
5
11111
10000
10000
11110
00001
00001
11110
6
00110
01000
10000
11110
10001
10001
01110
7
11111
00001
00010
00100
01000
01000
01000
8
01110
10001
10001
01110
10001
10001
01110
9
01110
10001
10001
01111
00001
00010
01100
DOT
00000
00000
00000
00000
00000
00100
00100
COMMA
00000
00000
00000
00000
00000
00100
01000
EXCL
00100
00100
00100
00100
00100
00000
00100
QUEST
01110
10001
00001
00010
00100
00000
00100
COLON
00000
00100
00000
00000
00000
00100
00000
SEMIC
00000
00100
00000
00000
00000
00100
01000
APO
00100
00100
01000
00000
00000
00000
00000
QUO
01010
01010
01010
00000
00000
00000
00000
DASH
00000
00000
00000
01110
00000
00000
00000
PLUS
00000
00100
00100
11111
00100
00100
00000
EQ
00000
00000
11111
00000
11111
00000
00000
SLASH
00001
00010
00010
00100
01000
01000
10000
BSLASH
10000
01000
01000
00100
00010
00010
00001
LPAREN
00010
00100
01000
01000
01000
00100
00010
RPAREN
01000
00100
00010
00010
00010
00100
01000
LT
00010
00100
01000
10000
01000
00100
00010
GT
01000
00100
00010
00001
00010
00100
01000
USCORE
00000
00000
00000
00000
00000
00000
11111
HASH
01010
01010
11111
01010
11111
01010
01010
DOLLAR
00100
01111
10100
01110
00101
11110
00100
PCT
11000
11001
00010
00100
01000
10011
00011
AMP
01100
10010
10010
01100
10101
10010
01101
STAR
00000
00100
10101
01110
10101
00100
00000
AT
01110
10001
10111
10101
10111
10000
01110
"""

# Token -> actual character
TOKEN_MAP = {
    "SP": " ",
    "DOT": ".",
    "COMMA": ",",
    "EXCL": "!",
    "QUEST": "?",
    "COLON": ":",
    "SEMIC": ";",
    "APO": "'",
    "QUO": '"',
    "DASH": "-",
    "PLUS": "+",
    "EQ": "=",
    "SLASH": "/",
    "BSLASH": "\\",
    "LPAREN": "(",
    "RPAREN": ")",
    "LT": "<",
    "GT": ">",
    "USCORE": "_",
    "HASH": "#",
    "DOLLAR": "$",
    "PCT": "%",
    "AMP": "&",
    "STAR": "*",
    "AT": "@",
}


def _build_font():
    """Parse FONT_DATA into {char: [[0/1 x5] x7]}."""
    font = {}
    lines = [ln.strip() for ln in FONT_DATA.strip().split("\n")]
    i = 0
    while i < len(lines):
        token = lines[i]
        if not token:
            i += 1
            continue
        rows = lines[i + 1:i + 8]
        if len(rows) < 7:
            break
        glyph = [[1 if ch == "1" else 0 for ch in row] for row in rows]
        ch = TOKEN_MAP.get(token, token)
        font[ch.upper()] = glyph
        i += 8
    return font


FONT = _build_font()
GLYPH_H = 7
GLYPH_W = 5
BLANK_GLYPH = [[0] * GLYPH_W for _ in range(GLYPH_H)]


def _line_bitmap(line):
    """Render one line of target text into a 7-row bitmap (list of lists)."""
    bitmap = [[] for _ in range(GLYPH_H)]
    for ch in line:
        if ch == " ":
            # word gap: 3 blank columns
            for r in range(GLYPH_H):
                bitmap[r].extend([0, 0, 0])
            continue
        glyph = FONT.get(ch.upper()) or BLANK_GLYPH
        for r in range(GLYPH_H):
            bitmap[r].extend(glyph[r])
            bitmap[r].append(0)  # 1-col gap between glyphs
    # trim trailing blank column
    for r in range(GLYPH_H):
        if bitmap[r] and bitmap[r][-1] == 0:
            bitmap[r].pop()
    return bitmap


def render(source, target, cols=110):
    """Generate ASCII art string from source/target text."""
    src = [c for c in source if not c.isspace()]
    if not src or not target.strip():
        return "", 0, 0, 0

    target_lines = target.split("\n")
    rendered_lines = []

    # Compute natural width across all lines to scale uniformly.
    bitmaps = [_line_bitmap(ln) for ln in target_lines]
    natural_w = max((max((len(r) for r in bm), default=0) for bm in bitmaps), default=0)
    if natural_w == 0:
        return "", 0, 0, 0

    # Block-scale so output width ~= cols. Each font pixel -> scale_x cells.
    # Char cells are ~2:1 (tall), so vertical scale is halved to preserve aspect.
    scale_x = max(1, round(cols / natural_w))
    scale_y = max(1, round(scale_x / 2.0))

    out_cols = natural_w * scale_x
    char_idx = 0

    for bm in bitmaps:
        if not any(bm):
            rendered_lines.append("")
            continue
        for row in range(GLYPH_H * scale_y):
            by = row // scale_y
            if by >= GLYPH_H or by >= len(bm):
                continue
            row_cells = []
            bm_row = bm[by]
            for col in range(out_cols):
                bx = col // scale_x
                if bx < len(bm_row) and bm_row[bx]:
                    row_cells.append(src[char_idx % len(src)])
                    char_idx += 1
                else:
                    row_cells.append(" ")
            rendered_lines.append("".join(row_cells).rstrip())

    art = "\n".join(rendered_lines)
    final_cols = max((len(l) for l in rendered_lines), default=0)
    final_rows = len(rendered_lines)
    final_chars = sum(1 for l in rendered_lines for c in l if c != " ")
    return art, final_rows, final_cols, final_chars


class handler(BaseHTTPRequestHandler):
    """BigWord edge renderer — POST JSON, get ASCII art back."""

    # Suppress default logging noise on the edge.
    def log_message(self, fmt, *args):
        pass

    def _json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("X-Powered-By", "Python Cloud Function @ EdgeOne")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._json(204, {})

    def do_GET(self):
        """Info endpoint — documents the API."""
        self._json(200, {
            "name": "BigWord Edge Renderer",
            "method": "POST",
            "params": {
                "source": "string — characters used as building blocks",
                "target": "string — text to visually reconstruct",
                "cols": "int (optional, default 110) — desired output columns",
            },
            "runtime": "python@edge",
            "note": "Pure standard-library Python with an embedded 5x7 bitmap font. Zero dependencies.",
        })

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length) if length > 0 else b""

        try:
            data = json.loads(raw.decode("utf-8")) if raw else {}
        except (ValueError, UnicodeDecodeError):
            self._json(400, {"error": "Invalid JSON body"})
            return

        source = str(data.get("source", "")).strip()
        target = str(data.get("target", "")).strip()
        try:
            cols = int(data.get("cols", 110))
        except (TypeError, ValueError):
            cols = 110

        if not source or not target:
            self._json(400, {"error": "Both 'source' and 'target' are required"})
            return

        art, rows, out_cols, chars = render(source, target, cols)

        self._json(200, {
            "art": art,
            "rows": rows,
            "cols": out_cols,
            "chars": chars,
            "generatedAt": time.time(),
            "runtime": "python@edge",
        })
