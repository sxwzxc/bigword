/* ============================================================
   BigWord shared logic
   — font definitions, CJK helpers, rasterization, and the
     core "big word made of small text" generators.
   Used by both the main tool (src/app/page.tsx) and the
   animated variant (src/app/animate/page.tsx).
   ============================================================ */

export interface FontDef {
  id: string
  label: string
  group: "中文" | "西文" | "等宽" | "系统"
  stack: string
  mono?: boolean
}

export const BUILTIN_FONTS: FontDef[] = [
  // 中文 — 无衬线
  { id: "pingfang", label: "苹方", group: "中文", stack: '"PingFang SC", "Helvetica Neue", sans-serif' },
  { id: "yahei", label: "微软雅黑", group: "中文", stack: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { id: "heiti", label: "黑体", group: "中文", stack: 'SimHei, "Heiti SC", "Microsoft YaHei", sans-serif' },
  { id: "noto-sans-sc", label: "思源黑体", group: "中文", stack: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
  { id: "hiragino", label: "冬青黑体", group: "中文", stack: '"Hiragino Sans GB", "Microsoft YaHei", sans-serif' },
  { id: "wenquanyi", label: "文泉驿微米黑", group: "中文", stack: '"WenQuanYi Micro Hei", "WenQuanYi Zen Hei", sans-serif' },
  // 中文 — 衬线
  { id: "songti", label: "宋体", group: "中文", stack: 'SimSun, "Songti SC", serif' },
  { id: "noto-serif-sc", label: "思源宋体", group: "中文", stack: '"Noto Serif SC", "Source Han Serif SC", serif' },
  { id: "kaiti", label: "楷体", group: "中文", stack: 'KaiTi, "STKaiti", "Kaiti SC", serif' },
  { id: "fangsong", label: "仿宋", group: "中文", stack: 'FangSong, "STFangsong", "STSong", serif' },
  // 中文 — 手写/艺术
  { id: "stkaiti", label: "华文楷体", group: "中文", stack: '"STKaiti", "KaiTi", serif' },
  { id: "sthupo", label: "华文琥珀", group: "中文", stack: '"STHupo", "Microsoft YaHei", sans-serif' },
  // 西文
  { id: "arial", label: "Arial", group: "西文", stack: "Arial, Helvetica, sans-serif" },
  { id: "helvetica", label: "Helvetica", group: "西文", stack: "Helvetica, Arial, sans-serif" },
  { id: "georgia", label: "Georgia", group: "西文", stack: "Georgia, serif" },
  { id: "times", label: "Times New Roman", group: "西文", stack: '"Times New Roman", Times, serif' },
  { id: "verdana", label: "Verdana", group: "西文", stack: "Verdana, Geneva, sans-serif" },
  { id: "trebuchet", label: "Trebuchet MS", group: "西文", stack: '"Trebuchet MS", Helvetica, sans-serif' },
  { id: "impact", label: "Impact", group: "西文", stack: 'Impact, "Haettenschweiler", sans-serif' },
  { id: "comic", label: "Comic Sans MS", group: "西文", stack: '"Comic Sans MS", "Comic Sans", cursive' },
  { id: "courier", label: "Courier New", group: "西文", stack: '"Courier New", Courier, monospace' },
  { id: "brush", label: "Brush Script MT", group: "西文", stack: '"Brush Script MT", cursive' },
  // 等宽 — 推荐
  { id: "sys-mono", label: "System Mono", group: "等宽", stack: "ui-monospace, SFMono-Regular, Menlo, monospace", mono: true },
  { id: "consolas", label: "Consolas", group: "等宽", stack: 'Consolas, "Courier New", monospace', mono: true },
  { id: "cascadia", label: "Cascadia Code", group: "等宽", stack: '"Cascadia Code", "Cascadia Mono", monospace', mono: true },
  { id: "jetbrains", label: "JetBrains Mono", group: "等宽", stack: '"JetBrains Mono", "JetBrains Mono NL", monospace', mono: true },
  { id: "fira", label: "Fira Code", group: "等宽", stack: '"Fira Code", "Fira Mono", monospace', mono: true },
  { id: "source-code", label: "Source Code Pro", group: "等宽", stack: '"Source Code Pro", monospace', mono: true },
  { id: "menlo", label: "Menlo", group: "等宽", stack: "Menlo, Monaco, monospace", mono: true },
  { id: "monaco", label: "Monaco", group: "等宽", stack: "Monaco, Menlo, monospace", mono: true },
  { id: "ubuntu-mono", label: "Ubuntu Mono", group: "等宽", stack: '"Ubuntu Mono", monospace', mono: true },
  { id: "roboto-mono", label: "Roboto Mono", group: "等宽", stack: '"Roboto Mono", monospace', mono: true },
  { id: "sarasa-mono", label: "更纱黑体 Mono", group: "等宽", stack: '"Sarasa Mono SC", "Sarasa Mono", monospace', mono: true },
  { id: "sarasa-term", label: "更纱黑体 Term", group: "等宽", stack: '"Sarasa Term SC", "Sarasa Mono SC", monospace', mono: true },
  { id: "lxgw", label: "霞鹜文楷", group: "等宽", stack: '"LXGW WenKai Mono", "LXGW WenKai", monospace', mono: true },
  { id: "dejavu", label: "DejaVu Sans Mono", group: "等宽", stack: '"DejaVu Sans Mono", monospace', mono: true },
  { id: "iosevka", label: "Iosevka", group: "等宽", stack: "Iosevka, monospace", mono: true },
  { id: "monoid", label: "Monoid", group: "等宽", stack: "Monoid, monospace", mono: true },
  { id: "hack", label: "Hack", group: "等宽", stack: "Hack, monospace", mono: true },
]

export const TEXT_COLORS = [
  { id: "white", value: "#ffffff" },
  { id: "amber", value: "#fbbf24" },
  { id: "sky", value: "#38bdf8" },
  { id: "emerald", value: "#34d399" },
  { id: "pink", value: "#f472b6" },
]

export const BG_COLORS = [
  { id: "slate-900", value: "#0f172a" },
  { id: "black", value: "#000000" },
  { id: "indigo-950", value: "#1e1b4b" },
  { id: "emerald-950", value: "#022c22" },
  { id: "white", value: "#ffffff" },
]

/* ============================================================
   CJK detection — cheap character-code check, no DOM needed
   ============================================================ */

export function isCJKCodePoint(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||  // Hangul Jamo
    (code >= 0x2e80 && code <= 0x303e) ||  // CJK Radicals / Kangxi
    (code >= 0x3040 && code <= 0x33bf) ||  // Hiragana, Katakana, CJK compat
    (code >= 0x3400 && code <= 0x4dbf) ||  // CJK Ext A
    (code >= 0x4e00 && code <= 0xa4cf) ||  // CJK Unified + Yi
    (code >= 0xac00 && code <= 0xd7af) ||  // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) ||  // CJK Compatibility Ideographs
    (code >= 0xfe30 && code <= 0xfe4f) ||  // CJK Compatibility Forms
    (code >= 0xff00 && code <= 0xffef)     // Fullwidth / Halfwidth
  )
}

export function containsCJK(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0)
    if (code !== undefined && isCJKCodePoint(code)) return true
  }
  return false
}

/* ============================================================
   Fullwidth conversion — when source contains CJK, convert all
   half-width ASCII (letters, digits, punctuation, space) to their
   fullwidth equivalents so every character has identical width.
   This is what makes mixed CJK+English+numbers align perfectly.
   ============================================================ */

export function toFullwidth(ch: string): string {
  const code = ch.codePointAt(0)
  if (code === undefined) return ch
  // Space → ideographic space (U+3000)
  if (code === 0x20) return "\u3000"
  // ASCII printable (0x21..0x7E) → fullwidth (U+FF01..U+FF5E)
  if (code >= 0x21 && code <= 0x7e) {
    return String.fromCodePoint(code + 0xfee0)
  }
  return ch
}

/* ============================================================
   Cell metrics — measure actual character width of the chosen
   source font. If source contains CJK, measure a CJK glyph
   (which is full-width / square) and use ideographic space
   (U+3000) for empty cells so every cell has identical width.
   ============================================================ */

export interface CellMetrics {
  charAspect: number  // cellH / cellW
  emptyChar: string   // " " for ASCII, "\u3000" for CJK
}

export function measureCellMetrics(fontStack: string, hasCJK: boolean): CellMetrics {
  const fallback: CellMetrics = { charAspect: 1.0, emptyChar: " " }
  if (typeof window === "undefined") return fallback
  try {
    const probe = document.createElement("span")
    probe.style.cssText =
      `font-family:${fontStack};font-size:100px;font-weight:700;` +
      `position:absolute;visibility:hidden;white-space:pre;` +
      `letter-spacing:0;line-height:1;`
    document.body.appendChild(probe)

    if (hasCJK) {
      // Measure a CJK character — it's full-width (square-ish).
      // All source chars will be converted to fullwidth, so they share this width.
      probe.textContent = "\u5b57"
      const cjkW = probe.getBoundingClientRect().width
      document.body.removeChild(probe)
      if (!cjkW || !isFinite(cjkW)) return { charAspect: 1.0, emptyChar: "\u3000" }
      return { charAspect: 100 / cjkW, emptyChar: "\u3000" }
    } else {
      // Pure ASCII — measure 'M' in the source font
      probe.textContent = "M"
      const asciiW = probe.getBoundingClientRect().width
      document.body.removeChild(probe)
      if (!asciiW || !isFinite(asciiW)) return fallback
      return { charAspect: 100 / asciiW, emptyChar: " " }
    }
  } catch {
    return fallback
  }
}

/* ============================================================
   Rasterize target text → dark/light grid via canvas sampling.
   Shared by both generateBigWord (string output) and
   buildAnimatedCells (per-cell output).
   ============================================================ */

export interface RasterResult {
  darkGrid: boolean[][]
  cols: number
  rows: number
}

export function rasterizeTarget(
  target: string,
  targetFontStack: string,
  baseFont: number,
  charAspect: number,
): RasterResult {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return { darkGrid: [], cols: 0, rows: 0 }

  const fontStack = `900 ${baseFont}px ${targetFontStack}`
  ctx.font = fontStack

  const lines = target.split("\n")
  const lineH = baseFont * 1.35
  const padding = Math.round(baseFont * 0.35)

  // Measure actual ink bounds (ascent/descent) to prevent glyph clipping.
  let maxW = 0
  let maxAscent = 0
  let maxDescent = 0
  for (const l of lines) {
    const m = ctx.measureText(l || " ")
    maxW = Math.max(maxW, m.width)
    if (m.actualBoundingBoxAscent) maxAscent = Math.max(maxAscent, m.actualBoundingBoxAscent)
    if (m.actualBoundingBoxDescent) maxDescent = Math.max(maxDescent, m.actualBoundingBoxDescent)
  }
  if (maxAscent === 0) maxAscent = baseFont * 0.85
  if (maxDescent === 0) maxDescent = baseFont * 0.25

  canvas.width = Math.max(1, Math.ceil(maxW + padding * 2))
  canvas.height = Math.max(1, Math.ceil(maxAscent + maxDescent + (lines.length - 1) * lineH + padding * 2))

  // canvas resize resets context state — re-apply
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "#000000"
  ctx.font = fontStack
  ctx.textBaseline = "alphabetic"
  ctx.textAlign = "left"
  lines.forEach((l, i) => ctx.fillText(l, padding, padding + maxAscent + i * lineH))

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data

  const cols = Math.max(8, Math.round(baseFont * 0.375))
  const cellW = canvas.width / cols
  const cellH = cellW * charAspect
  const rows = Math.ceil(canvas.height / cellH)

  // 2×2 area-averaged sub-sampling — detects any stroke touching the cell,
  // which fixes broken diagonals (撇捺) that single-point sampling misses.
  const SUB = 2
  const darkGrid: boolean[][] = []
  for (let r = 0; r < rows; r++) {
    const row: boolean[] = []
    for (let c = 0; c < cols; c++) {
      let brightSum = 0
      let sampleCount = 0
      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const x = Math.floor((c + (sx + 0.5) / SUB) * cellW)
          const y = Math.floor((r + (sy + 0.5) / SUB) * cellH)
          if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
            const p = (y * canvas.width + x) * 4
            brightSum += (img[p] + img[p + 1] + img[p + 2]) / 3
            sampleCount++
          }
        }
      }
      const bright = sampleCount > 0 ? brightSum / sampleCount : 255
      row.push(bright < 140)
    }
    darkGrid.push(row)
  }

  return { darkGrid, cols, rows }
}

/* ============================================================
   Core (string output): rasterize target → sample → fill with
   source chars. Used by the main tool's live preview.
   ============================================================ */

export function generateBigWord(
  source: string,
  target: string,
  targetFontStack: string,
  metrics: CellMetrics,
  targetBaseSize: number,
  preventTruncation: boolean,
  hasCJK: boolean,
): string {
  const tgt = target
  if (source.length === 0 || tgt.trim().length === 0) return ""

  const baseFont = Math.max(40, targetBaseSize)
  const { darkGrid, cols, rows } = rasterizeTarget(tgt, targetFontStack, baseFont, metrics.charAspect)

  const convertChar = (ch: string): string => hasCJK ? toFullwidth(ch) : ch

  const out: string[] = []

  if (preventTruncation) {
    const words = source.split(/\s+/).filter((w) => w.length > 0)
    if (words.length === 0) return ""

    const wordChars: string[][] = words.map((w) => [...w].map(convertChar))

    let wordIdx = 0
    let charInWord = 0

    for (let r = 0; r < rows; r++) {
      const darkCols: number[] = []
      for (let c = 0; c < cols; c++) {
        if (darkGrid[r][c]) darkCols.push(c)
      }

      const rowChars: string[] = new Array(cols).fill(metrics.emptyChar)
      let darkPtr = 0

      while (darkPtr < darkCols.length) {
        if (wordIdx >= wordChars.length) {
          wordIdx = 0
          charInWord = 0
        }

        const word = wordChars[wordIdx]
        const remainingInWord = word.length - charInWord
        const remainingDark = darkCols.length - darkPtr

        if (remainingInWord <= remainingDark) {
          for (let i = 0; i < remainingInWord; i++) {
            rowChars[darkCols[darkPtr]] = word[charInWord + i]
            darkPtr++
          }
          wordIdx++
          charInWord = 0
        } else if (remainingInWord > darkCols.length) {
          for (let i = 0; i < remainingDark; i++) {
            rowChars[darkCols[darkPtr]] = word[charInWord + i]
            darkPtr++
          }
          charInWord += remainingDark
          break
        } else {
          break
        }
      }

      out.push(rowChars.join("").replace(/[\s\u3000]+$/, ""))
    }
  } else {
    const src = [...source].map(convertChar)
    let idx = 0
    for (let r = 0; r < rows; r++) {
      const rowChars: string[] = []
      for (let c = 0; c < cols; c++) {
        if (darkGrid[r][c]) {
          rowChars.push(src[idx % src.length])
          idx++
        } else {
          rowChars.push(metrics.emptyChar)
        }
      }
      out.push(rowChars.join("").replace(/[\s\u3000]+$/, ""))
    }
  }

  return out.join("\n")
}

/* ============================================================
   Animated variant: returns the rasterized grid as a 2D array of
   cells so each character can be rendered as its own <span> and
   animated independently. `dark` cells carry a source character;
   `light` cells carry the empty filler.
   ============================================================ */

export interface AnimCell {
  ch: string
  dark: boolean
}

export interface AnimGrid {
  rows: number
  cols: number
  cells: AnimCell[][]
  charCount: number
}

export function buildAnimatedCells(
  source: string,
  target: string,
  targetFontStack: string,
  metrics: CellMetrics,
  targetBaseSize: number,
  hasCJK: boolean,
): AnimGrid {
  const tgt = target
  if (source.length === 0 || tgt.trim().length === 0) {
    return { rows: 0, cols: 0, cells: [], charCount: 0 }
  }

  const baseFont = Math.max(40, targetBaseSize)
  const { darkGrid, cols, rows } = rasterizeTarget(tgt, targetFontStack, baseFont, metrics.charAspect)

  const convertChar = (ch: string): string => hasCJK ? toFullwidth(ch) : ch
  const src = [...source].map(convertChar)
  let idx = 0

  const cells: AnimCell[][] = []
  for (let r = 0; r < rows; r++) {
    const row: AnimCell[] = []
    for (let c = 0; c < cols; c++) {
      if (darkGrid[r][c]) {
        row.push({ ch: src[idx % src.length], dark: true })
        idx++
      } else {
        row.push({ ch: metrics.emptyChar, dark: false })
      }
    }
    cells.push(row)
  }

  // Trim trailing empty cells per row (mirror generateBigWord's rstrip).
  for (const row of cells) {
    let last = row.length - 1
    while (last >= 0 && !row[last].dark) last--
    row.length = last + 1
  }

  const realCols = cells.reduce((m, row) => Math.max(m, row.length), 0)
  const charCount = cells.reduce((sum, row) => sum + row.filter((c) => c.dark).length, 0)

  return { rows: cells.length, cols: realCols, cells, charCount }
}
