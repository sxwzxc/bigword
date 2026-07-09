// ============================================================
//  AnimateText — independent animated "big word from small words"
//  engine. This module is SELF-CONTAINED: it does NOT import anything
//  from @/lib/bigword and does NOT reuse the character-art grid logic.
//  It rasterizes the target text on an offscreen <canvas>, samples a
//  grid mask, then renders each small character with the Canvas 2D API
//  inside a requestAnimationFrame loop so every cell can be animated.
// ============================================================

export type AnimKind = "pulse" | "wave" | "scroll" | "blink" | "rainbow" | "drift" | "none"

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

/** Deterministic per-cell random parameters driving the animations. */
interface CellSeed {
  phase: number // pulse / blink phase
  spd: number // pulse / blink frequency multiplier
  px: number // drift initial angle
  py: number // (unused, kept for seed parity)
  fx: number // (unused, kept for seed parity)
  fy: number // (unused, kept for seed parity)
  ps: number // drift scale phase
  fs: number // drift scale frequency
}

/**
 * A roaming dot for the "drift" effect. Positions are stored in GRID units
 * (col/row space, 0..cols / 0..rows) so they survive canvas resizes. Each dot
 * wanders freely across the WHOLE big shape and bounces off its walls, like a
 * ball bouncing inside the letter.
 */
interface Particle {
  gx: number
  gy: number
  vx: number // unit direction X (flipped on wall bounce)
  vy: number // unit direction Y
  ps: number // scale phase
  fs: number // scale frequency
  base: number // source char index
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
  private seeds: CellSeed[] = []
  private mask: boolean[][] = [] // dark-cell grid (true = inside the big shape)
  private particles: Particle[] = [] // roaming dots for the "drift" effect
  private lastT = 0 // previous frame time (for dt in the drift simulation)
  private sourceAspect = 1 // source char height / width

  private raf = 0
  private running = false
  private startTime = 0

  constructor(canvas: HTMLCanvasElement, opts: AnimateOptions) {
    this.canvas = canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("2D context unavailable")
    this.ctx = ctx
    this.opts = opts
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

    // Deterministic per-cell random seeds so each small character animates
    // on its own, independently of its neighbours. Derived from a stable
    // hash of the cell coordinates (no Math.random → reproducible).
    this.seeds = this.cells.map((cell) => {
      const s = (cell.col * 73856093) ^ (cell.row * 19349663)
      const h = s >>> 0
      const rnd = (n: number) => {
        const v = Math.sin(h * 0.0001 + n * 2.137) * 43758.5453
        return v - Math.floor(v)
      }
      return {
        phase: rnd(1) * Math.PI * 2,
        spd: 0.6 + rnd(2) * 0.9,
        px: rnd(3) * Math.PI * 2,
        py: rnd(4) * Math.PI * 2,
        fx: 0.7 + rnd(5) * 1.1,
        fy: 0.7 + rnd(6) * 1.1,
        ps: rnd(7) * Math.PI * 2,
        fs: 0.8 + rnd(8) * 1.2,
      }
    })

    // Dark-cell mask (grid of booleans) — used by the drift simulation to
    // keep each roaming dot INSIDE the big shape (it bounces off the walls).
    this.mask = Array.from({ length: this.rows }, () => new Array<boolean>(this.cols).fill(false))
    for (const cell of this.cells) this.mask[cell.row][cell.col] = true

    // One roaming particle per dark cell; starts at its home cell centre with
    // a random direction. The drift simulation moves these across the WHOLE
    // shape (not confined to the cell), bouncing off the shape's walls.
    this.particles = this.cells.map((cell, i) => {
      const ang = this.seeds[i].px
      return {
        gx: cell.col + 0.5,
        gy: cell.row + 0.5,
        vx: Math.cos(ang),
        vy: Math.sin(ang),
        ps: this.seeds[i].ps,
        fs: this.seeds[i].fs,
        base: cell.base,
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
    this.startTime = typeof performance !== "undefined" ? performance.now() : Date.now()
    const loop = (now: number) => {
      if (!this.running) return
      const t = (now - this.startTime) / 1000
      this.drawFrame(t)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private rainbowColor(t: number, col: number, row: number): string {
    const hue = (t * (90 / this.opts.duration) + (col + row) * 7) % 360
    return `hsl(${(hue + 360) % 360}, 85%, 62%)`
  }

  /** Is the grid-space point (gx, gy) inside the big shape? */
  private inMaskCell(gx: number, gy: number): boolean {
    const c = Math.floor(gx)
    const r = Math.floor(gy)
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.mask[r][c]
  }

  /**
   * "Random drift" effect: every small A is a particle that roams freely
   * across the ENTIRE big shape and bounces off its inner walls (like a ball
   * bouncing inside the letter), while each one independently scales up/down.
   * Positions are in grid units, so resizing the canvas stays correct.
   */
  private drawDrift(t: number) {
    const o = this.opts
    const ctx = this.ctx
    const cellW = this.cssW / this.cols
    const cellH = this.cssH / this.rows
    const baseFont = Math.min(cellW, cellH) * 0.82
    const isRainbow = o.anim === "rainbow"
    const omega = (2 * Math.PI) / o.duration
    const list = this.charList
    const hi = o.scale
    const lo = Math.max(0.3, 2 - hi)

    let dt = this.lastT === 0 ? 0.016 : t - this.lastT
    this.lastT = t
    if (!(dt > 0) || dt > 0.1) dt = 0.016

    // Roaming speed in grid-cells per second, tied to the "speed" slider.
    const gs = this.cols * 0.18 * (1.6 / o.duration)

    ctx.font = `bold ${baseFont}px ${o.sourceFontStack}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    for (const p of this.particles) {
      const moveX = p.vx * gs * dt
      const moveY = p.vy * gs * dt
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(moveX), Math.abs(moveY)) / 0.5))
      const sx = moveX / steps
      const sy = moveY / steps
      for (let s = 0; s < steps; s++) {
        const inX = this.inMaskCell(p.gx + sx, p.gy)
        const inY = this.inMaskCell(p.gx, p.gy + sy)
        const inBoth = this.inMaskCell(p.gx + sx, p.gy + sy)
        if (inBoth) {
          p.gx += sx
          p.gy += sy
        } else {
          // Hit a wall of the big shape → reflect the offending axis(es) and
          // nudge the direction a little so the motion looks chaotic.
          if (inX) { p.gx += sx; p.vy = -p.vy }
          if (inY) { p.gy += sy; p.vx = -p.vx }
          if (!inX && !inY) { p.vx = -p.vx; p.vy = -p.vy }
          const a = (Math.random() - 0.5) * 0.7
          const ca = Math.cos(a)
          const sa = Math.sin(a)
          const nvx = p.vx * ca - p.vy * sa
          const nvy = p.vx * sa + p.vy * ca
          p.vx = nvx
          p.vy = nvy
          break
        }
      }

      const cx = p.gx * cellW
      const cy = p.gy * cellH
      const k = 0.5 + 0.5 * Math.sin(t * omega * p.fs + p.ps)
      const scale = lo + (hi - lo) * k
      ctx.save()
      ctx.translate(cx, cy)
      if (scale !== 1) ctx.scale(scale, scale)
      ctx.fillStyle = isRainbow
        ? this.rainbowColor(t, Math.floor(p.gx), Math.floor(p.gy))
        : o.textColor
      ctx.fillText(list[p.base % list.length], 0, 0)
      ctx.restore()
    }
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

    const t = tSec
    const omega = (2 * Math.PI) / o.duration
    const list = this.charList
    const hi = o.scale // max scale (强度)
    const lo = Math.max(0.3, 2 - hi) // min scale, so the character stays visible

    // Drift is a particle simulation handled entirely on its own (dots roam
    // the whole big shape), so skip the per-cell loop below.
    if (o.anim === "drift") {
      this.drawDrift(t)
      return
    }

    ctx.font = `bold ${baseFont}px ${o.sourceFontStack}`

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i]
      const seed = this.seeds[i]
      const cx = (cell.col + 0.5) * cellW
      const cy = (cell.row + 0.5) * cellH
      const dx = 0
      let dy = 0
      let scale = 1
      let alpha = 1
      const ch = list[cell.base % list.length]

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
        case "scroll": {
          // PIXEL-LEVEL vertical scroll: a clipped stream of source chars
          // translated by a continuous sub-pixel offset (no character swaps).
          const lineH = baseFont * 0.95
          const n = list.length
          const total = lineH * n
          let off = (t * (total / o.duration)) % total
          if (off < 0) off += total
          const mLo = Math.floor((off - cellH / 2) / lineH) - 1
          const mHi = Math.ceil((off + cellH / 2) / lineH) + 1
          ctx.save()
          ctx.beginPath()
          ctx.rect(cx - cellW / 2, cy - cellH / 2, cellW, cellH)
          ctx.clip()
          ctx.globalAlpha = alpha
          ctx.fillStyle = isRainbow ? this.rainbowColor(t, cell.col, cell.row) : o.textColor
          for (let m = mLo; m <= mHi; m++) {
            const y = cy + m * lineH - off
            const idx = ((m % n) + n) % n
            ctx.fillText(list[idx], cx, y)
          }
          ctx.restore()
          continue
        }
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
      ctx.translate(cx + dx, cy + dy)
      if (scale !== 1) ctx.scale(scale, scale)
      ctx.fillStyle = isRainbow ? this.rainbowColor(t, cell.col, cell.row) : o.textColor
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
