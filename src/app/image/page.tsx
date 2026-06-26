"use client"

import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Image as ImageIcon,
  Download,
  RotateCcw,
  Type,
  Check,
  Search,
  ScanLine,
  ChevronDown,
  X,
  ZoomIn,
  ZoomOut,
  Pencil,
  Eraser,
  Pipette,
  Maximize2,
  Hand,
  Sparkles,
  Shuffle,
  Hash,
  Move,
  Grid3x3,
} from "lucide-react"
import Link from "next/link"

interface FontDef {
  id: string
  label: string
  group: "中文" | "西文" | "等宽" | "系统"
  stack: string
  mono?: boolean
}

const BUILTIN_FONTS: FontDef[] = [
  { id: "pingfang", label: "苹方", group: "中文", stack: '"PingFang SC", "Helvetica Neue", sans-serif' },
  { id: "yahei", label: "微软雅黑", group: "中文", stack: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { id: "heiti", label: "黑体", group: "中文", stack: 'SimHei, "Heiti SC", "Microsoft YaHei", sans-serif' },
  { id: "noto-sans-sc", label: "思源黑体", group: "中文", stack: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
  { id: "hiragino", label: "冬青黑体", group: "中文", stack: '"Hiragino Sans GB", "Microsoft YaHei", sans-serif' },
  { id: "wenquanyi", label: "文泉驿微米黑", group: "中文", stack: '"WenQuanYi Micro Hei", "WenQuanYi Zen Hei", sans-serif' },
  { id: "songti", label: "宋体", group: "中文", stack: 'SimSun, "Songti SC", serif' },
  { id: "noto-serif-sc", label: "思源宋体", group: "中文", stack: '"Noto Serif SC", "Source Han Serif SC", serif' },
  { id: "kaiti", label: "楷体", group: "中文", stack: 'KaiTi, "STKaiti", "Kaiti SC", serif' },
  { id: "fangsong", label: "仿宋", group: "中文", stack: 'FangSong, "STFangsong", "STSong", serif' },
  { id: "stkaiti", label: "华文楷体", group: "中文", stack: '"STKaiti", "KaiTi", serif' },
  { id: "sthupo", label: "华文琥珀", group: "中文", stack: '"STHupo", "Microsoft YaHei", sans-serif' },
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

const TEXT_COLORS = [
  { id: "white", value: "#ffffff" },
  { id: "black", value: "#000000" },
  { id: "amber", value: "#fbbf24" },
  { id: "sky", value: "#38bdf8" },
  { id: "emerald", value: "#34d399" },
  { id: "pink", value: "#f472b6" },
  { id: "red", value: "#ef4444" },
  { id: "indigo", value: "#6366f1" },
]

const BG_COLORS = [
  { id: "transparent", value: "transparent" },
  { id: "white", value: "#ffffff" },
  { id: "black", value: "#000000" },
  { id: "slate-900", value: "#0f172a" },
  { id: "indigo-950", value: "#1e1b4b" },
  { id: "emerald-950", value: "#022c22" },
]

type Tool = "select" | "pan" | "pencil" | "eraser" | "eyedropper"

function isSpace(ch: string): boolean {
  return ch === " " || ch === "\u3000" || ch === "\t" || ch === "\n"
}

function isCJKCodePoint(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0x303e) ||
    (code >= 0x3040 && code <= 0x33bf) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xffef)
  )
}

function containsCJK(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0)
    if (code !== undefined && isCJKCodePoint(code)) return true
  }
  return false
}

function toFullwidth(ch: string): string {
  const code = ch.codePointAt(0)
  if (code === undefined) return ch
  if (code === 0x20) return "\u3000"
  if (code >= 0x21 && code <= 0x7e) {
    return String.fromCodePoint(code + 0xfee0)
  }
  return ch
}

interface CellMetrics {
  charAspect: number
  emptyChar: string
}

function measureCellMetrics(fontStack: string, hasCJK: boolean): CellMetrics {
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
      probe.textContent = "\u5b57"
      const cjkW = probe.getBoundingClientRect().width
      document.body.removeChild(probe)
      if (!cjkW || !isFinite(cjkW)) return { charAspect: 1.0, emptyChar: "\u3000" }
      return { charAspect: 100 / cjkW, emptyChar: "\u3000" }
    } else {
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

function otsuThreshold(hist: number[], total: number): number {
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let wB = 0
  let maxVar = 0
  let threshold = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const betweenVar = wB * wF * (mB - mF) * (mB - mF)
    if (betweenVar > maxVar) {
      maxVar = betweenVar
      threshold = t
    }
  }
  return threshold
}

function gaussianKernel(size: number, sigma: number): number[][] {
  const center = (size - 1) / 2
  const kernel: number[][] = []
  let sum = 0
  for (let y = 0; y < size; y++) {
    const row: number[] = []
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const w = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma))
      row.push(w)
      sum += w
    }
    kernel.push(row)
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum
    }
  }
  return kernel
}

interface CharInkBounds {
  width: number
  height: number
  offsetX: number
  offsetY: number
}

const charInkBoundsCache = new Map<string, CharInkBounds>()

function measureCharInkBounds(ch: string, fontStack: string, fontSize: number): CharInkBounds {
  const cacheKey = `${ch}|${fontStack}|${fontSize}`
  const cached = charInkBoundsCache.get(cacheKey)
  if (cached) return cached

  const fallback: CharInkBounds = { width: fontSize, height: fontSize, offsetX: 0, offsetY: 0 }
  if (typeof window === "undefined") return fallback

  try {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return fallback

    const pad = Math.ceil(fontSize * 0.3)
    const canvasSize = Math.ceil(fontSize * 2) + pad * 2
    canvas.width = canvasSize
    canvas.height = canvasSize

    ctx.font = `700 ${fontSize}px ${fontStack}`
    ctx.textBaseline = "middle"
    ctx.textAlign = "center"
    ctx.fillStyle = "#000000"
    ctx.fillText(ch, canvasSize / 2, canvasSize / 2)

    const imgData = ctx.getImageData(0, 0, canvasSize, canvasSize)
    const data = imgData.data

    let minX = canvasSize, maxX = 0, minY = canvasSize, maxY = 0
    let found = false

    for (let y = 0; y < canvasSize; y++) {
      for (let x = 0; x < canvasSize; x++) {
        const alpha = data[(y * canvasSize + x) * 4 + 3]
        if (alpha > 10) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
          found = true
        }
      }
    }

    if (!found) {
      charInkBoundsCache.set(cacheKey, fallback)
      return fallback
    }

    const result: CharInkBounds = {
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      offsetX: minX - canvasSize / 2,
      offsetY: minY - canvasSize / 2,
    }

    charInkBoundsCache.set(cacheKey, result)
    return result
  } catch {
    charInkBoundsCache.set(cacheKey, fallback)
    return fallback
  }
}

interface CoverageMap {
  coverage: number[][]
  cols: number
  rows: number
  cellW: number
  cellH: number
  targetW: number
  targetH: number
}

function rasterizeTargetCoverageMap(
  target: string,
  fontStack: string,
  targetFontSize: number,
  charAspect: number,
  densityMultiplier: number,
): CoverageMap | null {
  if (!target || target.trim() === "") return null

  const SS = 4
  const baseFont = Math.max(40, targetFontSize) * SS
  const font = `900 ${baseFont}px ${fontStack}`

  const probeCanvas = document.createElement("canvas")
  const probeCtx = probeCanvas.getContext("2d")
  if (!probeCtx) return null
  probeCtx.font = font

  const lines = target.split("\n")
  const lineH = baseFont * 1.35
  const padding = Math.round(baseFont * 0.35)

  let maxW = 0
  let maxAscent = 0
  let maxDescent = 0
  for (const l of lines) {
    const m = probeCtx.measureText(l || " ")
    maxW = Math.max(maxW, m.width)
    if (m.actualBoundingBoxAscent) maxAscent = Math.max(maxAscent, m.actualBoundingBoxAscent)
    if (m.actualBoundingBoxDescent) maxDescent = Math.max(maxDescent, m.actualBoundingBoxDescent)
  }
  if (maxAscent === 0) maxAscent = baseFont * 0.85
  if (maxDescent === 0) maxDescent = baseFont * 0.25

  probeCanvas.width = Math.max(1, Math.ceil(maxW + padding * 2))
  probeCanvas.height = Math.max(1, Math.ceil(maxAscent + maxDescent + (lines.length - 1) * lineH + padding * 2))

  probeCtx.fillStyle = "#ffffff"
  probeCtx.fillRect(0, 0, probeCanvas.width, probeCanvas.height)
  probeCtx.fillStyle = "#000000"
  probeCtx.font = font
  probeCtx.textBaseline = "alphabetic"
  probeCtx.textAlign = "left"
  lines.forEach((l, i) => probeCtx.fillText(l, padding, padding + maxAscent + i * lineH))

  const img = probeCtx.getImageData(0, 0, probeCanvas.width, probeCanvas.height).data
  const imgW = probeCanvas.width
  const imgH = probeCanvas.height

  const hist = new Array(256).fill(0)
  for (let i = 0; i < img.length; i += 4) {
    const bright = Math.round((img[i] + img[i + 1] + img[i + 2]) / 3)
    hist[bright]++
  }
  const totalPixels = img.length / 4
  const adaptiveThreshold = otsuThreshold(hist, totalPixels)

  const baseCols = Math.max(8, Math.round(targetFontSize * 0.375))
  const cols = Math.max(8, Math.round(baseCols * densityMultiplier))
  const cellW = imgW / cols
  const cellH = cellW * charAspect
  const rows = Math.ceil(imgH / cellH)

  const SUB = 8
  const kernel = gaussianKernel(SUB, 1.5)

  const coverage: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      let weightedSum = 0
      let weightTotal = 0
      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const x = Math.floor((c + (sx + 0.5) / SUB) * cellW)
          const y = Math.floor((r + (sy + 0.5) / SUB) * cellH)
          if (x >= 0 && x < imgW && y >= 0 && y < imgH) {
            const p = (y * imgW + x) * 4
            const bright = (img[p] + img[p + 1] + img[p + 2]) / 3
            const isDark = bright < adaptiveThreshold ? 1 : 0
            const w = kernel[sy][sx]
            weightedSum += isDark * w
            weightTotal += w
          }
        }
      }
      const cov = weightTotal > 0 ? weightedSum / weightTotal : 0
      row.push(cov)
    }
    coverage.push(row)
  }

  return { coverage, cols, rows, cellW, cellH, targetW: imgW, targetH: imgH }
}

function renderGlyphArt(
  coverageMap: CoverageMap,
  source: string,
  sourceFontStack: string,
  charAspect: number,
  fontSize: number,
  options: {
    textColor: string
    bgColor: string
    preventTruncation: boolean
    hasCJK: boolean
    offsetX: number
    offsetY: number
    edgeSoftening: boolean
    weightBalance: boolean
  },
): HTMLCanvasElement | null {
  if (!coverageMap || !source) return null

  const { coverage, cols, rows } = coverageMap
  const { textColor, bgColor, preventTruncation, hasCJK, offsetX, offsetY, edgeSoftening, weightBalance } = options

  const charW = fontSize / charAspect
  const lineH = fontSize * 1.0
  const padding = 24

  const outputW = Math.ceil(cols * charW + padding * 2)
  const outputH = Math.ceil(rows * lineH + padding * 2)

  const canvas = document.createElement("canvas")
  canvas.width = outputW
  canvas.height = outputH
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  if (bgColor !== "transparent") {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, outputW, outputH)
  } else {
    ctx.clearRect(0, 0, outputW, outputH)
  }

  ctx.textBaseline = "middle"
  ctx.textAlign = "center"
  ctx.fillStyle = textColor

  const convertChar = (ch: string): string => hasCJK ? toFullwidth(ch) : ch

  const getCellPlacement = (cov: number): { size: number; opacity: number } | null => {
    if (weightBalance) {
      if (cov >= 0.85) return { size: 1.0, opacity: 1.0 }
      if (cov >= 0.55) return { size: 0.9, opacity: 1.0 }
      if (cov >= 0.3) return { size: 0.75, opacity: 0.85 }
      if (cov >= 0.12) return { size: 0.6, opacity: 0.6 }
      return null
    } else {
      if (cov >= 0.5) return { size: 1.0, opacity: 1.0 }
      return null
    }
  }

  const applyEdgeSoftening = (cov: number, opacity: number): number => {
    if (!edgeSoftening) return opacity
    if (cov < 0.12) return 0
    if (cov < 0.6) {
      const t = (cov - 0.12) / (0.6 - 0.12)
      return opacity * (0.3 + 0.7 * t)
    }
    return opacity
  }

  const drawChar = (ch: string, cx: number, cy: number, sizeScale: number, opacity: number) => {
    if (isSpace(ch)) return
    const actualSize = fontSize * sizeScale
    ctx.font = `700 ${actualSize}px ${sourceFontStack}`
    ctx.globalAlpha = opacity

    const inkBounds = measureCharInkBounds(ch, sourceFontStack, actualSize)
    const drawX = cx - inkBounds.offsetX - inkBounds.width / 2
    const drawY = cy - inkBounds.offsetY - inkBounds.height / 2

    ctx.fillText(ch, drawX, drawY)
    ctx.globalAlpha = 1.0
  }

  const getActiveCols = (row: number): { col: number; placement: { size: number; opacity: number } }[] => {
    const result: { col: number; placement: { size: number; opacity: number } }[] = []
    for (let c = 0; c < cols; c++) {
      const cov = coverage[row][c]
      const placement = getCellPlacement(cov)
      if (placement) {
        const finalOpacity = applyEdgeSoftening(cov, placement.opacity)
        result.push({ col: c, placement: { size: placement.size, opacity: finalOpacity } })
      }
    }
    return result
  }

  if (preventTruncation) {
    const words = source.split(/\s+/).filter((w) => w.length > 0)
    if (words.length === 0) return canvas

    const wordChars: string[][] = words.map((w) => [...w].map(convertChar))

    let wordIdx = 0
    let charInWord = 0

    for (let r = 0; r < rows; r++) {
      const activeCols = getActiveCols(r)
      if (activeCols.length === 0) continue

      let activePtr = 0
      while (activePtr < activeCols.length) {
        if (wordIdx >= wordChars.length) {
          wordIdx = 0
          charInWord = 0
        }

        const word = wordChars[wordIdx]
        const remainingInWord = word.length - charInWord
        const remainingActive = activeCols.length - activePtr

        if (remainingInWord <= remainingActive) {
          for (let i = 0; i < remainingInWord; i++) {
            const ch = word[charInWord + i]
            const { col, placement } = activeCols[activePtr]
            drawChar(
              ch,
              padding + col * charW + charW / 2 + offsetX,
              padding + r * lineH + lineH / 2 + offsetY,
              placement.size,
              placement.opacity,
            )
            activePtr++
          }
          wordIdx++
          charInWord = 0
        } else if (remainingInWord > activeCols.length) {
          for (let i = 0; i < remainingActive; i++) {
            const ch = word[charInWord + i]
            const { col, placement } = activeCols[activePtr]
            drawChar(
              ch,
              padding + col * charW + charW / 2 + offsetX,
              padding + r * lineH + lineH / 2 + offsetY,
              placement.size,
              placement.opacity,
            )
            activePtr++
          }
          charInWord += remainingActive
          break
        } else {
          break
        }
      }
    }
  } else {
    const src = [...source].map(convertChar)
    if (src.length === 0) return canvas

    let idx = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cov = coverage[r][c]
        const placement = getCellPlacement(cov)
        if (!placement) continue
        const ch = src[idx % src.length]
        idx++
        const finalOpacity = applyEdgeSoftening(cov, placement.opacity)
        drawChar(
          ch,
          padding + c * charW + charW / 2 + offsetX,
          padding + r * lineH + lineH / 2 + offsetY,
          placement.size,
          finalOpacity,
        )
      }
    }
  }

  return canvas
}

interface FontPickerProps {
  accent: string
  fonts: FontDef[]
  selectedId: string
  onSelect: (id: string) => void
  systemFonts: FontDef[]
  onScan: () => void
  scanning: boolean
  scanError: string | null
}

function FontPicker({
  accent,
  fonts,
  selectedId,
  onSelect,
  systemFonts,
  onScan,
  scanning,
  scanError,
}: FontPickerProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"中文" | "西文" | "等宽" | "系统">("中文")
  const [query, setQuery] = useState("")
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const selected = fonts.find((f) => f.id === selectedId) ?? systemFonts.find((f) => f.id === selectedId)

  const tabs: ("中文" | "西文" | "等宽" | "系统")[] = ["中文", "西文", "等宽", "系统"]

  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const POP_MAX_H = 360
    const GAP = 6
    let top = rect.bottom + GAP
    if (top + POP_MAX_H > window.innerHeight) {
      top = Math.max(8, rect.top - POP_MAX_H - GAP)
    }
    let left = rect.left
    const width = Math.max(rect.width, 340)
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8)
    }
    setCoords({ top, left, width })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return
      setOpen(false)
    }
    const onScroll = (e: Event) => {
      const t = e.target as Node
      if (popoverRef.current?.contains(t)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener("mousedown", handler)
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onResize)
    return () => {
      document.removeEventListener("mousedown", handler)
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onResize)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  let list: FontDef[]
  if (tab === "系统") list = systemFonts
  else list = fonts.filter((f) => f.group === tab)

  const filtered = query.trim()
    ? list.filter(
        (f) =>
          f.label.toLowerCase().includes(query.toLowerCase()) ||
          f.id.toLowerCase().includes(query.toLowerCase()),
      )
    : list

  const popover =
    open && coords ? (
      createPortal(
        <>
          <div className="font-picker-overlay" onClick={() => setOpen(false)} />
          <div
            ref={popoverRef}
            className="font-picker"
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
          >
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="font-picker-search"
                placeholder="搜索字体…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="font-picker-tabs">
              {tabs.map((t) => (
                <button
                  key={t}
                  className={`font-picker-tab ${tab === t ? "active" : ""}`}
                  onClick={() => { setTab(t); setQuery("") }}
                >
                  {t}
                  {t === "系统" && systemFonts.length > 0 && (
                    <span className="ml-1 opacity-70">{systemFonts.length}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="font-picker-list">
              {tab === "系统" && systemFonts.length === 0 && (
                <div className="font-picker-empty">
                  {scanError ? (
                    <span className="text-rose-500">{scanError}</span>
                  ) : (
                    "点击下方按钮扫描本机已安装的字体"
                  )}
                </div>
              )}
              {filtered.map((f) => (
                <div
                  key={f.id}
                  className={`font-picker-item ${selectedId === f.id ? "active" : ""}`}
                  onClick={() => { onSelect(f.id); setOpen(false) }}
                >
                  <span className="font-picker-item-name" style={{ fontFamily: f.stack }}>
                    {f.label}
                  </span>
                  {selectedId === f.id && <Check className="w-4 h-4 font-picker-item-check" />}
                </div>
              ))}
              {filtered.length === 0 && tab !== "系统" && (
                <div className="font-picker-empty">无匹配字体</div>
              )}
            </div>
            {tab === "系统" && (
              <div className="font-picker-scan">
                <button
                  onClick={onScan}
                  disabled={scanning}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {scanning ? (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ScanLine className="w-3.5 h-3.5" />
                  )}
                  {scanning ? "扫描中…" : "扫描系统字体"}
                </button>
                <p className="text-[10px] text-slate-400 mt-1.5 text-center leading-relaxed">
                  需 Chrome / Edge 103+，首次使用会请求授权
                </p>
              </div>
            )}
          </div>
        </>,
        document.body,
      )
    ) : null

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-colors cursor-pointer text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
          <span className="text-sm font-semibold text-slate-800 truncate" style={{ fontFamily: selected?.stack }}>
            {selected?.label ?? "选择字体"}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {popover}
    </>
  )
}

export default function ImagePage() {
  const [source, setSource] = useState("鳖鳖")
  const [target, setTarget] = useState("赖疙宝")
  const [cellSize, setCellSize] = useState(12)
  const [targetFontSize, setTargetFontSize] = useState(320)
  const [gridDensity, setGridDensity] = useState(1.5)
  const [targetFontId, setTargetFontId] = useState("yahei")
  const [sourceFontId, setSourceFontId] = useState("yahei")
  const [textColor, setTextColor] = useState("#818cf8")
  const [bgColor, setBgColor] = useState("#0f172a")
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [preventTruncation, setPreventTruncation] = useState(false)
  const [edgeSoftening, setEdgeSoftening] = useState(true)
  const [weightBalance, setWeightBalance] = useState(true)

  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [activeTool, setActiveTool] = useState<Tool>("pencil")
  const [pencilColor, setPencilColor] = useState("#ff0000")
  const [pencilSize, setPencilSize] = useState(1)
  const [showGrid, setShowGrid] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false)

  const [systemFonts, setSystemFonts] = useState<FontDef[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const allFonts = useMemo(() => [...BUILTIN_FONTS, ...systemFonts], [systemFonts])
  const targetFont = allFonts.find((f) => f.id === targetFontId) ?? BUILTIN_FONTS[0]
  const sourceFont = allFonts.find((f) => f.id === sourceFontId) ?? BUILTIN_FONTS[0]

  const hasCJK = useMemo(() => containsCJK(source), [source])

  const scanSystemFonts = useCallback(async () => {
    setScanning(true)
    setScanError(null)
    try {
      const w = window as unknown as {
        queryLocalFonts?: () => Promise<Array<{ family: string; fullName: string; style: string }>>
      }
      if (!w.queryLocalFonts) {
        setScanError("当前浏览器不支持 Local Font Access API")
        return
      }
      const result = await w.queryLocalFonts()
      const seen = new Set<string>()
      const defs: FontDef[] = []
      for (const f of result) {
        const fam = f.family
        if (!fam || seen.has(fam)) continue
        seen.add(fam)
        defs.push({ id: `sys:${fam}`, label: fam, group: "系统", stack: `"${fam}", monospace` })
      }
      defs.sort((a, b) => a.label.localeCompare(b.label))
      setSystemFonts(defs)
    } catch {
      setScanError("扫描失败，请授权后重试")
    } finally {
      setScanning(false)
    }
  }, [])

  const renderPixelArtToCanvas = useCallback(() => {
    if (!source || !target.trim()) return null

    const metrics = measureCellMetrics(sourceFont.stack, hasCJK)
    const coverageMap = rasterizeTargetCoverageMap(target, targetFont.stack, targetFontSize, metrics.charAspect, gridDensity)
    if (!coverageMap) return null

    const canvas = renderGlyphArt(coverageMap, source, sourceFont.stack, metrics.charAspect, cellSize, {
      textColor,
      bgColor,
      preventTruncation,
      hasCJK,
      offsetX,
      offsetY,
      edgeSoftening,
      weightBalance,
    })

    return canvas
  }, [source, target, cellSize, targetFontSize, gridDensity, targetFont.stack, sourceFont.stack, textColor, bgColor, offsetX, offsetY, preventTruncation, hasCJK, edgeSoftening, weightBalance])

  useEffect(() => {
    const canvas = renderPixelArtToCanvas()
    renderCanvasRef.current = canvas

    const displayCanvas = canvasRef.current
    if (!displayCanvas || !canvas) return

    displayCanvas.width = canvas.width
    displayCanvas.height = canvas.height
    const ctx = displayCanvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(canvas, 0, 0)

    const overlay = overlayCanvasRef.current
    if (overlay) {
      overlay.width = canvas.width
      overlay.height = canvas.height
      const octx = overlay.getContext("2d")
      if (octx) {
        octx.clearRect(0, 0, overlay.width, overlay.height)
      }
    }
  }, [renderPixelArtToCanvas])

  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return { x: 0, y: 0 }
    const rect = overlay.getBoundingClientRect()
    const scaleX = overlay.width / rect.width
    const scaleY = overlay.height / rect.height
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY),
    }
  }, [])

  const applyPixel = useCallback((x: number, y: number) => {
    const overlay = overlayCanvasRef.current
    const base = renderCanvasRef.current
    if (!overlay || !base) return

    const octx = overlay.getContext("2d")
    if (!octx) return

    if (activeTool === "pencil") {
      octx.fillStyle = pencilColor
      const half = Math.floor(pencilSize / 2)
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          octx.fillRect(x + dx, y + dy, 1, 1)
        }
      }
    } else if (activeTool === "eraser") {
      octx.clearRect(x, y, pencilSize, pencilSize)
    } else if (activeTool === "eyedropper") {
      const bctx = base.getContext("2d")
      if (!bctx) return
      const pixel = bctx.getImageData(x, y, 1, 1).data
      const hex = "#" + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, "0")).join("")
      setPencilColor(hex)
      setActiveTool("pencil")
    }

    const displayCanvas = canvasRef.current
    if (!displayCanvas) return
    const dctx = displayCanvas.getContext("2d")
    if (!dctx) return
    dctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height)
    dctx.drawImage(base, 0, 0)
    dctx.drawImage(overlay, 0, 0)
  }, [activeTool, pencilColor, pencilSize])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === "pan") {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
      return
    }
    if (activeTool === "pencil" || activeTool === "eraser" || activeTool === "eyedropper") {
      setIsDrawing(true)
      const { x, y } = getCanvasCoords(e)
      applyPixel(x, y)
    }
  }, [activeTool, panOffset, getCanvasCoords, applyPixel])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
      return
    }
    if (isDrawing && (activeTool === "pencil" || activeTool === "eraser")) {
      const { x, y } = getCanvasCoords(e)
      applyPixel(x, y)
    }
  }, [isPanning, isDrawing, activeTool, panStart, getCanvasCoords, applyPixel])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setIsDrawing(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.max(0.1, Math.min(20, z + delta)))
  }, [])

  const handleZoomIn = () => setZoom(z => Math.min(20, z * 1.2))
  const handleZoomOut = () => setZoom(z => Math.max(0.1, z / 1.2))
  const handleFitView = () => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const handleExport = () => {
    const base = renderCanvasRef.current
    const overlay = overlayCanvasRef.current
    if (!base) return

    const exportCanvas = document.createElement("canvas")
    exportCanvas.width = base.width
    exportCanvas.height = base.height
    const ctx = exportCanvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(base, 0, 0)
    if (overlay) ctx.drawImage(overlay, 0, 0)

    exportCanvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `bigword-pixel-${target.slice(0, 10) || "output"}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, "image/png")
  }

  const handleClearOverlay = () => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    const ctx = overlay.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, overlay.width, overlay.height)

    const base = renderCanvasRef.current
    const displayCanvas = canvasRef.current
    if (!displayCanvas || !base) return
    const dctx = displayCanvas.getContext("2d")
    if (!dctx) return
    dctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height)
    dctx.drawImage(base, 0, 0)
  }

  const handleShuffle = () => {
    setSource((s) =>
      [...s].map((c) => ({ c, k: Math.random() })).sort((a, b) => a.k - b.k).map((x) => x.c).join(""),
    )
  }

  const handleReset = () => {
    setSource("鳖鳖")
    setTarget("赖疙宝")
    setCellSize(12)
    setTargetFontSize(320)
    setGridDensity(1.5)
    setTargetFontId("yahei")
    setSourceFontId("yahei")
    setTextColor("#818cf8")
    setBgColor("#0f172a")
    setOffsetX(0)
    setOffsetY(0)
    setPreventTruncation(false)
    setEdgeSoftening(true)
    setWeightBalance(true)
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
    handleClearOverlay()
  }

  const toolItems: { tool: Tool; icon: React.ReactNode; label: string }[] = [
    { tool: "pan", icon: <Hand className="w-4 h-4" />, label: "平移" },
    { tool: "pencil", icon: <Pencil className="w-4 h-4" />, label: "画笔" },
    { tool: "eraser", icon: <Eraser className="w-4 h-4" />, label: "橡皮擦" },
    { tool: "eyedropper", icon: <Pipette className="w-4 h-4" />, label: "取色" },
  ]

  const cursorStyle = activeTool === "pan" ? (isPanning ? "grabbing" : "grab") : "crosshair"

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-pink-300/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-amber-200/25 blur-3xl" />
      </div>

      <header className="header-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
                <Type className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900">BigWord</span>
                <span className="text-xs text-slate-400 ml-1.5 hidden sm:inline">字符画</span>
              </div>
            </Link>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md shadow-pink-500/30">
                <ImageIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">ImageForge</span>
              <span className="text-xs text-slate-400 ml-1 hidden sm:inline">像素画板</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              by <span className="font-semibold text-slate-600">sxwzxc</span>
            </span>
            <a
              href="https://github.com/sxwzxc/bigword"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
              aria-label="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 py-6 md:py-12">
        <div className="text-center mb-6 animate-fade-in-up">
          <h1 className="text-4xl md:text-6xl font-black leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500">
              像素画板
            </span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">像素级渲染 · 逐像素控制 · 精确到每一个撇捺</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          <div className="space-y-4">
            <Card className="flat-card border-0 shadow-sm animate-fade-in-up animation-delay-100">
              <CardContent className="p-4 space-y-3">
                <span className="label-pill" style={{ color: "#ec4899" }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  素材文本
                </span>
                <textarea
                  className="tool-textarea"
                  rows={3}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="作为字符来源的文本"
                />
                <div className="flex items-center justify-between">
                  <span className="stat-chip">
                    <Hash className="w-3 h-3" />
                    {[...source.replace(/\s+/g, "")].length}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasCJK && (
                      <span className="stat-chip" style={{ background: "#fef3c7", border: "#fde68a", color: "#92400e" }}>
                        CJK
                      </span>
                    )}
                    <label className="flex items-center gap-1 cursor-pointer select-none text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={preventTruncation}
                        onChange={(e) => setPreventTruncation(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-500 cursor-pointer accent-indigo-500"
                      />
                      防截断
                    </label>
                    <button
                      onClick={handleShuffle}
                      className="text-slate-400 hover:text-amber-500 transition-colors p-1.5 rounded-lg hover:bg-amber-50 cursor-pointer"
                      title="打乱素材顺序"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-medium">素材字体</label>
                  <FontPicker
                    accent="#10b981"
                    fonts={allFonts}
                    selectedId={sourceFontId}
                    onSelect={setSourceFontId}
                    systemFonts={systemFonts}
                    onScan={scanSystemFonts}
                    scanning={scanning}
                    scanError={scanError}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="flat-card border-0 shadow-sm animate-fade-in-up animation-delay-200">
              <CardContent className="p-4 space-y-3">
                <span className="label-pill" style={{ color: "#6366f1" }}>
                  <Type className="w-3.5 h-3.5" />
                  目标文本
                </span>
                <textarea
                  className="tool-textarea"
                  rows={3}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="最终要呈现的内容"
                />
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-medium">目标字体</label>
                  <FontPicker
                    accent="#6366f1"
                    fonts={allFonts}
                    selectedId={targetFontId}
                    onSelect={setTargetFontId}
                    systemFonts={systemFonts}
                    onScan={scanSystemFonts}
                    scanning={scanning}
                    scanError={scanError}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="flat-card border-0 shadow-sm animate-fade-in-up animation-delay-200">
              <CardContent className="p-4 space-y-3">
                <span className="label-pill" style={{ color: "#f59e0b" }}>
                  <Grid3x3 className="w-3.5 h-3.5" />
                  像素网格
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-500 font-medium">网格单元大小</label>
                    <span className="stat-chip">{cellSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={32}
                    step={1}
                    value={cellSize}
                    onChange={(e) => setCellSize(Number(e.target.value))}
                    className="tool-slider"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-500 font-medium">目标字号</label>
                    <span className="stat-chip">{targetFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={600}
                    step={10}
                    value={targetFontSize}
                    onChange={(e) => setTargetFontSize(Number(e.target.value))}
                    className="tool-slider"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-500 font-medium">网格密度</label>
                    <span className="stat-chip">{gridDensity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={4}
                    step={0.1}
                    value={gridDensity}
                    onChange={(e) => setGridDensity(Number(e.target.value))}
                    className="tool-slider"
                  />
                  <p className="text-[10px] text-slate-400">越高则撇捺细节越精细</p>
                </div>
              </CardContent>
            </Card>

            <Card className="flat-card border-0 shadow-sm animate-fade-in-up animation-delay-300">
              <CardContent className="p-4 space-y-3">
                <span className="label-pill" style={{ color: "#8b5cf6" }}>
                  <Move className="w-3.5 h-3.5" />
                  精细控制
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-500 font-medium">X偏移</label>
                      <span className="stat-chip">{offsetX}px</span>
                    </div>
                    <input
                      type="range"
                      min={-20}
                      max={20}
                      step={1}
                      value={offsetX}
                      onChange={(e) => setOffsetX(Number(e.target.value))}
                      className="tool-slider"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-500 font-medium">Y偏移</label>
                      <span className="stat-chip">{offsetY}px</span>
                    </div>
                    <input
                      type="range"
                      min={-20}
                      max={20}
                      step={1}
                      value={offsetY}
                      onChange={(e) => setOffsetY(Number(e.target.value))}
                      className="tool-slider"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">文字颜色</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setTextColor(c.value)}
                        className={`color-swatch ${textColor === c.value ? "color-swatch-active" : ""}`}
                        style={{ backgroundColor: c.value, border: c.value === "#ffffff" ? "2px solid #e2e8f0" : undefined }}
                      >
                        {textColor === c.value && (
                          <Check className={`w-3 h-3 ${c.value === "#ffffff" ? "text-slate-800" : "text-white"}`} />
                        )}
                      </button>
                    ))}
                    <label className="color-swatch cursor-pointer relative overflow-hidden" style={{ background: "conic-gradient(from 0deg, #f43f5e, #fbbf24, #34d399, #38bdf8, #a78bfa, #f43f5e)" }}>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">背景颜色</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {BG_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setBgColor(c.value)}
                        className={`color-swatch ${bgColor === c.value ? "color-swatch-active" : ""}`}
                        style={{
                          backgroundColor: c.value === "transparent" ? "#fff" : c.value,
                          border: c.value === "transparent" ? "2px dashed #cbd5e1" : c.value === "#ffffff" ? "2px solid #e2e8f0" : undefined,
                        }}
                      >
                        {c.value === "transparent" && <X className="w-3 h-3 text-slate-400" />}
                        {bgColor === c.value && c.value !== "transparent" && (
                          <Check className={`w-3 h-3 ${c.value === "#ffffff" ? "text-slate-800" : "text-white"}`} />
                        )}
                      </button>
                    ))}
                    <label className="color-swatch cursor-pointer relative overflow-hidden" style={{ background: "conic-gradient(from 0deg, #f43f5e, #fbbf24, #34d399, #38bdf8, #a78bfa, #f43f5e)" }}>
                      <input
                        type="color"
                        value={bgColor === "transparent" ? "#ffffff" : bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-500 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={edgeSoftening}
                      onChange={(e) => setEdgeSoftening(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-500 cursor-pointer accent-indigo-500"
                    />
                    <span className="font-medium">边缘柔化</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-500 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={weightBalance}
                      onChange={(e) => setWeightBalance(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-500 cursor-pointer accent-indigo-500"
                    />
                    <span className="font-medium">笔画权重均衡</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card className="flat-card border-0 shadow-sm animate-fade-in-up animation-delay-300">
              <CardContent className="p-4 space-y-3">
                <span className="label-pill" style={{ color: "#10b981" }}>
                  <Pencil className="w-3.5 h-3.5" />
                  像素编辑
                </span>
                <div className="flex gap-1">
                  {toolItems.map((item) => (
                    <button
                      key={item.tool}
                      onClick={() => setActiveTool(item.tool)}
                      className={`seg-btn flex-1 flex items-center justify-center gap-1 ${activeTool === item.tool ? "seg-btn-active" : ""}`}
                      title={item.label}
                    >
                      {item.icon}
                      <span className="text-[10px] hidden sm:inline">{item.label}</span>
                    </button>
                  ))}
                </div>
                {(activeTool === "pencil" || activeTool === "eraser") && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-500 font-medium">
                        {activeTool === "pencil" ? "画笔大小" : "橡皮擦大小"}
                      </label>
                      <span className="stat-chip">{pencilSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={32}
                      step={1}
                      value={pencilSize}
                      onChange={(e) => setPencilSize(Number(e.target.value))}
                      className="tool-slider"
                    />
                  </div>
                )}
                {activeTool === "pencil" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">画笔颜色</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#ffffff", "#000000"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setPencilColor(c)}
                          className={`color-swatch ${pencilColor === c ? "color-swatch-active" : ""}`}
                          style={{ backgroundColor: c, border: c === "#ffffff" ? "2px solid #e2e8f0" : undefined }}
                        >
                          {pencilColor === c && (
                            <Check className={`w-3 h-3 ${c === "#ffffff" ? "text-slate-800" : "text-white"}`} />
                          )}
                        </button>
                      ))}
                      <label className="color-swatch cursor-pointer relative overflow-hidden" style={{ background: "conic-gradient(from 0deg, #f43f5e, #fbbf24, #34d399, #38bdf8, #a78bfa, #f43f5e)" }}>
                        <input
                          type="color"
                          value={pencilColor}
                          onChange={(e) => setPencilColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleClearOverlay}
                    className="seg-btn flex-1 text-xs"
                  >
                    清除编辑
                  </button>
                  <label className="flex items-center gap-1 cursor-pointer select-none text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-500 cursor-pointer accent-indigo-500"
                    />
                    显示网格
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 animate-fade-in-up animation-delay-300">
              <Button
                onClick={handleExport}
                className="btn-primary rounded-lg cursor-pointer flex-1"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                导出 PNG
              </Button>
              <Button
                onClick={handleReset}
                variant="ghost"
                className="text-slate-500 hover:text-indigo-600 cursor-pointer"
                size="sm"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="flat-card border-0 shadow-sm animate-fade-in-up animation-delay-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={handleZoomOut} className="h-7 w-7 p-0 cursor-pointer">
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="stat-chip min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
                    <Button size="sm" variant="ghost" onClick={handleZoomIn} className="h-7 w-7 p-0 cursor-pointer">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleFitView} className="h-7 px-2 cursor-pointer text-xs">
                      <Maximize2 className="w-3.5 h-3.5 mr-1" />
                      适应
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="stat-chip">
                      <ImageIcon className="w-3 h-3" />
                      {renderCanvasRef.current ? `${renderCanvasRef.current.width}×${renderCanvasRef.current.height}` : "—"}
                    </span>
                  </div>
                </div>

                <div
                  ref={containerRef}
                  className="preview-wrap overflow-hidden relative"
                  style={{
                    maxHeight: "70vh",
                    minHeight: 400,
                    backgroundColor: bgColor === "transparent" ? "#f8fafc" : bgColor,
                    cursor: cursorStyle,
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                >
                  <div
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                      transformOrigin: "0 0",
                      display: "inline-block",
                      position: "relative",
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      style={{ display: "block" }}
                    />
                    <canvas
                      ref={overlayCanvasRef}
                      style={{ position: "absolute", top: 0, left: 0, display: "block" }}
                    />
                    {showGrid && zoom >= 4 && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          backgroundImage: `
                            linear-gradient(to right, rgba(100,116,139,0.3) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(100,116,139,0.3) 1px, transparent 1px)
                          `,
                          backgroundSize: `${cellSize}px ${cellSize}px`,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>滚轮缩放 · 拖拽平移 · 当前工具: {toolItems.find(t => t.tool === activeTool)?.label}</span>
                  {renderCanvasRef.current && (
                    <span>偏移 ({panOffset.x}, {panOffset.y})</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="feature-card p-4 animate-fade-in-up animation-delay-100">
                <div className="w-10 h-10 mb-3 rounded-xl bg-pink-100 flex items-center justify-center">
                  <Grid3x3 className="w-5 h-5 text-pink-600" />
                </div>
                <h3 className="font-bold mb-1 text-slate-800 text-sm">像素级渲染</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  每个撇捺都是独立像素，精确控制每一笔
                </p>
              </div>
              <div className="feature-card p-4 animate-fade-in-up animation-delay-200">
                <div className="w-10 h-10 mb-3 rounded-xl bg-rose-100 flex items-center justify-center">
                  <Move className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-bold mb-1 text-slate-800 text-sm">精细偏移控制</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  逐像素偏移、全角半角自适应对齐
                </p>
              </div>
              <div className="feature-card p-4 animate-fade-in-up animation-delay-300">
                <div className="w-10 h-10 mb-3 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Download className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-bold mb-1 text-slate-800 text-sm">高清导出</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  导出 PNG 格式，保留所有像素细节
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer-border mt-12">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 py-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <span>Powered by</span>
          <a
            href="https://pages.edgeone.ai" target="_blank" rel="noopener noreferrer"
            className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 font-medium"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
            EdgeOne Pages
          </a>
        </div>
      </footer>
    </div>
  )
}
