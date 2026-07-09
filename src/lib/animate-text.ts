// ============================================================
//  AnimateText — independent animated "big word from small words"
//  engine. This module is SELF-CONTAINED: it does NOT import anything
//  from @/lib/bigword and does NOT reuse the character-art grid logic.
//  It rasterizes the target text on an offscreen <canvas>, samples a
//  grid mask, then renders each small character with the Canvas 2D API
//  inside a requestAnimationFrame loop so every cell can be animated.
// ============================================================

export type AnimKind = "pulse" | "wave" | "scroll" | "blink" | "rainbow" | "none"

export interface FontDef {
  id: string
  label: string
  stack: string
}

// Local, independent font list (NOT shared with the character-art page).
export const ANIMATE_FONTS: FontDef[] = [
  // Chinese
  { id: "yahei", label: "微软雅黑", stack: '"Microsoft YaHei","PingFang SC","Hiragino Sans GB","Source Han Sans SC",sans-serif' },
  { id: "song", label: "宋体", stack: '"SimSun","Songti SC","STSong",serif' },
  { id: "kai", label: "楷体", stack: '"KaiTi","Kaiti SC","STKaiti",serif' },
  { id: "hei", label: "黑体", stack: '"SimHei","Heiti SC","STHeiti",sans-serif' },
  { id: "fangsong", label: "仿宋", stack: '"FangSong","FangSong_GB2312","STFangsong",serif' },
  { id: "lishu", label: "隶书", stack: '"LiSu","STLiti",serif' },
  { id: "youyuan", label: "幼圆", stack: '"YouYuan","YouYuan",sans-serif' },
  { id: "huawen", label: "华文行楷", stack: '"STXingkai","Xingkai SC",cursive' },
  // Western
  { id: "arial", label: "Arial", stack: 'Arial,Helvetica,sans-serif' },
  { id: "georgia", label: "Georgia", stack: 'Georgia,"Times New Roman",serif' },
  { id: "times", label: "Times", stack: '"Times New Roman",Times,serif' },
  { id: "courier", label: "Courier", stack: '"Courier New",Courier,monospace' },
  { id: "impact", label: "Impact", stack: 'Impact,"Haettenschweiler",sans-serif' },
  { id: "verdana", label: "Verdana", stack: 'Verdana,Geneva,sans-serif' },
  { id: "comic", label: "Comic Sans", stack: '"Comic Sans MS","Comic Sans",cursive' },
  { id: "trebuchet", label: "Trebuchet", stack: '"Trebuchet MS",Verdana,sans-serif' },
]

export interface AnimateOptions {
  source: string
  target: string
  targetFontStack: string
  sourceFontStack: string
  density: number // number of grid columns
  anim: AnimKind
  duration: number // seconds per cycle
  scale: number // amplitude for pulse / wave (1.0 = none)
  textColor: string
  bgColor: string
}

interface Cell {
  col: number
  row: number
  base: number // index into source char list (static fallback)
}

export class AnimatedBigText {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private opts: AnimateOptions
  private dpr = 1
  private cssW = 0
  private cssH = 0

  private cols = 0
  private rows = 0
  private cells: Cell[] = []
  private charList: string[] = []
  private seeds: { phase: number; spd: number }[] = []
  private sourceAspect = 1 // source char height / width

  private raf = 0
  private running = false
  private reducedMotion = false

  constructor(canvas: HTMLCanvasElement, opts: AnimateOptions) {
    this.canvas = canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("2D context unavailable")
    this.ctx = ctx
    this.opts = opts
    if (typeof window !== "undefined" && window.matchMedia) {
      this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    }
  }

  setOptions(patch: Partial<AnimateOptions>) {
    this.opts = { ...this.opts, ...patch }
  }

  get stats() {
    return { cols: this.cols, rows: this.rows, count: this.cells.length }
  }

  /** Measure the source font's character aspect (height / width) for tiling. */
  private measureSource() {
    const probe = this.firstPrintable(this.opts.source) || "A"
    this.ctx.font = `bold 100px ${this.opts.sourceFontStack}`
    const m = this.ctx.measureText(probe)
    const w = m.width || 50
    const h = (m.actualBoundingBoxAscent || 75) + (m.actualBoundingBoxDescent || 25)
    this.sourceAspect = h / Math.max(1, w)
  }

  private firstPrintable(s: string): string | null {
    for (const ch of [...s]) {
      if (ch.trim().length > 0) return ch
    }
    return null
  }

  /** Build the grid mask from the target text using an offscreen canvas. */
  compute() {
    const o = this.opts
    this.measureSource()

    const off = document.createElement("canvas")
    const octx = off.getContext("2d")
    if (!octx) return

    const baseFont = Math.max(60, Math.round(o.density * 6))
    const tFont = `900 ${baseFont}px ${o.targetFontStack}`
    octx.font = tFont
    const metrics = octx.measureText(o.target || " ")
    const textW = Math.max(1, metrics.width)
    const ascent = metrics.actualBoundingBoxAscent || baseFont * 0.72
    const descent = metrics.actualBoundingBoxDescent || baseFont * 0.22
    const textH = ascent + descent
    const padX = baseFont * 0.12
    const padY = baseFont * 0.08

    off.width = Math.ceil(textW + padX * 2)
    off.height = Math.ceil(textH + padY * 2)
    octx.font = tFont
    octx.clearRect(0, 0, off.width, off.height)
    octx.fillStyle = "#fff"
    octx.textAlign = "center"
    octx.textBaseline = "alphabetic"
    octx.fillText(o.target || " ", off.width / 2, padY + ascent)

    const cols = Math.max(8, Math.round(o.density))
    const cellW = off.width / cols
    const cellH = cellW * this.sourceAspect
    const rows = Math.max(1, Math.ceil(off.height / cellH))

    const img = octx.getImageData(0, 0, off.width, off.height).data
    const sample = (cx: number, cy: number) => {
      const px = Math.max(0, Math.min(off.width - 1, Math.round(cx)))
      const py = Math.max(0, Math.min(off.height - 1, Math.round(cy)))
      return img[(py * off.width + px) * 4 + 3]
    }

    this.cols = cols
    this.rows = rows
    const cells: Cell[] = []
    let idx = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = (c + 0.5) * cellW
        const cy = (r + 0.5) * cellH
        if (sample(cx, cy) > 128) {
          cells.push({ col: c, row: r, base: idx })
          idx++
        }
      }
    }
    this.cells = cells

    const list = [...o.source].filter((ch) => ch.trim().length > 0)
    this.charList = list.length ? list : ["●"]

    // Deterministic per-cell random seeds (phase + speed) so each small
    // character scales on its own, independently of its neighbours.
    this.seeds = this.cells.map((cell) => {
      const s = (cell.col * 73856093) ^ (cell.row * 19349663)
      const h = (s >>> 0) % 100000
      return {
        phase: (h / 100000) * Math.PI * 2,
        spd: 0.6 + ((h >> 7) % 1000) / 1000 * 0.9,
      }
    })

    this.layout()
  }

  /** Size the visible canvas to its container, preserving the mask aspect. */
  private layout() {
    const parent = this.canvas.parentElement
    const availW = parent ? parent.clientWidth : 800
    const offAspect = (this.rows * this.sourceAspect) / this.cols // height / width
    this.cssW = Math.max(120, availW)
    this.cssH = Math.max(80, this.cssW * offAspect)
    this.dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)
    this.canvas.width = Math.round(this.cssW * this.dpr)
    this.canvas.height = Math.round(this.cssH * this.dpr)
    this.canvas.style.width = "100%"
    this.canvas.style.height = `${this.cssH}px`
  }

  resize() {
    if (this.cells.length) this.layout()
  }

  start() {
    if (this.running) return
    this.running = true
    const loop = (now: number) => {
      if (!this.running) return
      this.drawFrame(now / 1000)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private rainbowColor(t: number, cell: Cell): string {
    const hue = (t * (90 / this.opts.duration) + (cell.col + cell.row) * 7) % 360
    return `hsl(${(hue + 360) % 360}, 85%, 62%)`
  }

  private withAlpha(hex: string, a: number): string {
    let h = hex.replace("#", "")
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }

  drawFrame(tSec: number) {
    const o = this.opts
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.cssW, this.cssH)
    ctx.fillStyle = o.bgColor
    ctx.fillRect(0, 0, this.cssW, this.cssH)

    if (this.cells.length === 0) return

    const cellW = this.cssW / this.cols
    const cellH = this.cssH / this.rows
    const baseFont = Math.min(cellW, cellH) * 0.82
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Faint static base layer: keeps the big shape (B) readable at all times,
    // so the bright animated characters read as "small A's living inside B".
    const isRainbow = o.anim === "rainbow"
    ctx.font = `bold ${baseFont * 0.32}px ${o.sourceFontStack}`
    ctx.fillStyle = isRainbow ? "rgba(255,255,255,0.12)" : this.withAlpha(o.textColor, 0.14)
    for (const cell of this.cells) {
      const cx = (cell.col + 0.5) * cellW
      const cy = (cell.row + 0.5) * cellH
      ctx.fillText(this.charList[cell.base % this.charList.length], cx, cy)
    }

    const t = this.reducedMotion ? 0 : tSec
    const omega = (2 * Math.PI) / o.duration
    const list = this.charList
    const hi = o.scale // max scale (强度)
    const lo = Math.max(0.3, 2 - hi) // min scale, so the character stays visible

    ctx.font = `bold ${baseFont}px ${o.sourceFontStack}`

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i]
      const seed = this.seeds[i]
      const cx = (cell.col + 0.5) * cellW
      const cy = (cell.row + 0.5) * cellH
      let dy = 0
      let scale = 1
      let alpha = 1
      let ch = list[cell.base % list.length]

      switch (o.anim) {
        case "pulse": {
          // Each character breathes on its OWN random phase + frequency.
          const k = 0.5 + 0.5 * Math.sin(t * omega * seed.spd + seed.phase)
          scale = lo + (hi - lo) * k
          break
        }
        case "wave":
          dy = cellH * Math.max(0, hi - 1) * 0.6 * Math.sin(t * omega + cell.col * 0.4)
          break
        case "scroll":
          // characters flow vertically through each cell
          ch = list[Math.floor(t * (list.length / o.duration) + cell.row) % list.length]
          break
        case "blink": {
          const k = 0.5 + 0.5 * Math.sin(t * omega * seed.spd + seed.phase)
          alpha = 0.22 + 0.78 * k
          break
        }
        case "rainbow":
        case "none":
        default:
          break
      }

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(cx, cy + dy)
      if (scale !== 1) ctx.scale(scale, scale)
      ctx.fillStyle = isRainbow ? this.rainbowColor(t, cell) : o.textColor
      ctx.fillText(ch, 0, 0)
      ctx.restore()
    }
  }

  /** Render a single static frame and return a PNG data URL. */
  toPNG(): string {
    this.drawFrame(performance.now() / 1000)
    return this.canvas.toDataURL("image/png")
  }
}
