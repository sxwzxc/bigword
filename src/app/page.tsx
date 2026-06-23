"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Zap,
  Copy,
  Download,
  Shuffle,
  RotateCcw,
  Cloud,
  Sparkles,
  Type,
  Grid3x3,
  Hash,
  Palette,
  Check,
} from "lucide-react"

/* ============================================================
   Font presets
   - TARGET fonts shape the big glyph (rendered on Canvas)
   - SOURCE fonts are monospace families used to display the
     small building-block characters (must be monospace so the
     preview grid stays aligned with the sampling grid)
   ============================================================ */

const TARGET_FONTS = [
  { id: "sans", label: "无衬线", stack: 'Arial, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif' },
  { id: "serif", label: "衬线", stack: 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif' },
  { id: "mono", label: "等宽", stack: 'ui-monospace, Menlo, Consolas, monospace' },
  { id: "bold", label: "粗黑", stack: '"Arial Black", "Heiti SC", "Microsoft YaHei", sans-serif' },
] as const

const SOURCE_FONTS = [
  { id: "mono", label: "System Mono", stack: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  { id: "consolas", label: "Consolas", stack: 'Consolas, "Courier New", monospace' },
  { id: "cascadia", label: "Cascadia", stack: '"Cascadia Code", "JetBrains Mono", "Fira Code", monospace' },
] as const

const TEXT_COLORS = [
  { id: "white", value: "#e5e7eb" },
  { id: "blue", value: "#5A9FD4" },
  { id: "yellow", value: "#FFD43B" },
  { id: "green", value: "#4ade80" },
  { id: "pink", value: "#f472b6" },
  { id: "orange", value: "#fb923c" },
] as const

/* ============================================================
   Measure the real cell aspect ratio (cellH / cellW) of a
   monospace font at line-height:1. The sampling grid MUST use
   the same ratio so each sampled pixel maps exactly to one
   character cell in the <pre> preview — this is what makes the
   reconstructed glyph look perfectly aligned.
   ============================================================ */

function measureCharAspect(fontStack: string): number {
  if (typeof window === "undefined") return 1.67
  try {
    const probe = document.createElement("span")
    probe.style.cssText =
      `font-family:${fontStack};font-size:100px;font-weight:700;` +
      `position:absolute;visibility:hidden;white-space:pre;` +
      `letter-spacing:0;line-height:1;`
    probe.textContent = "M"
    document.body.appendChild(probe)
    const w = probe.getBoundingClientRect().width
    document.body.removeChild(probe)
    if (!w || !isFinite(w)) return 1.67
    return 100 / w // cellH(=100) / cellW(=w)
  } catch {
    return 1.67
  }
}

/* ============================================================
   Core: rasterize target text with the chosen target font on an
   offscreen Canvas, then sample pixels on a grid whose aspect
   ratio matches the preview's monospace cells. Dark pixels get
   the next source character; light pixels get a space.
   ============================================================ */

function generateBigWord(
  source: string,
  target: string,
  density: number,
  targetFontStack: string,
  charAspect: number,
): string {
  const src = [...source.replace(/\s+/g, "")]
  const tgt = target
  if (src.length === 0 || tgt.trim().length === 0) return ""

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  const baseFont = 320
  const fontStack = `900 ${baseFont}px ${targetFontStack}`
  ctx.font = fontStack

  const lines = tgt.split("\n")
  const lineH = baseFont * 1.2
  const padding = Math.round(baseFont * 0.2)
  let maxW = 0
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l || " ").width)

  canvas.width = Math.max(1, Math.ceil(maxW + padding * 2))
  canvas.height = Math.max(1, Math.ceil(lineH * lines.length + padding * 2))

  // canvas resize resets context state — re-apply
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "#000000"
  ctx.font = fontStack
  ctx.textBaseline = "middle"
  ctx.textAlign = "left"
  lines.forEach((l, i) => ctx.fillText(l, padding, padding + (i + 0.5) * lineH))

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const cols = Math.max(8, Math.round(density))
  const cellW = canvas.width / cols
  const cellH = cellW * charAspect // ← matches preview cell ratio → perfect alignment
  const rows = Math.ceil(canvas.height / cellH)

  const out: string[] = []
  let idx = 0
  for (let r = 0; r < rows; r++) {
    const rowChars: string[] = []
    for (let c = 0; c < cols; c++) {
      const x = Math.floor((c + 0.5) * cellW)
      const y = Math.floor((r + 0.5) * cellH)
      let bright = 255
      if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
        const p = (y * canvas.width + x) * 4
        bright = (img[p] + img[p + 1] + img[p + 2]) / 3
      }
      if (bright < 140) {
        rowChars.push(src[idx % src.length])
        idx++
      } else {
        rowChars.push(" ")
      }
    }
    out.push(rowChars.join("").replace(/\s+$/, ""))
  }
  return out.join("\n")
}

/* ============================================================
   Edge function result type
   ============================================================ */

interface EdgeResult {
  art: string
  rows: number
  cols: number
  chars: number
  generatedAt: number
  runtime: string
  region?: string
}

/* ============================================================
   Presets — each carries a recommended target font
   ============================================================ */

const PRESETS: { source: string; target: string; label: string; font: string }[] = [
  { source: "Hello World!", target: "HI", label: "HI", font: "sans" },
  { source: "EdgeOne Edge Function Python Cloud", target: "EDGE", label: "EDGE", font: "bold" },
  { source: "用字符堆叠出大字的视觉效果拼字艺术", target: "大字", label: "大字", font: "sans" },
  { source: "0123456789", target: "2026", label: "2026", font: "sans" },
]

export default function Home() {
  const [source, setSource] = useState("Hello EdgeOne!")
  const [target, setTarget] = useState("HI")
  const [density, setDensity] = useState(120)
  const [fontSize, setFontSize] = useState(10)
  const [targetFontId, setTargetFontId] = useState<string>("sans")
  const [sourceFontId, setSourceFontId] = useState<string>("mono")
  const [textColor, setTextColor] = useState<string>("#e5e7eb")
  const [art, setArt] = useState("")
  const [tab, setTab] = useState<"live" | "edge">("live")
  const [edgeResult, setEdgeResult] = useState<EdgeResult | null>(null)
  const [edgeLoading, setEdgeLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const targetFont = TARGET_FONTS.find((f) => f.id === targetFontId) ?? TARGET_FONTS[0]
  const sourceFont = SOURCE_FONTS.find((f) => f.id === sourceFontId) ?? SOURCE_FONTS[0]

  // Measure the real cell aspect ratio of the chosen source font.
  // Recomputed only when the source font changes.
  const charAspect = useMemo(() => measureCharAspect(sourceFont.stack), [sourceFont.stack])

  // Debounced real-time preview
  const recompute = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setArt(generateBigWord(source, target, density, targetFont.stack, charAspect))
    }, 110)
  }, [source, target, density, targetFont.stack, charAspect])

  useEffect(() => {
    recompute()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [recompute])

  const stats = useMemo(() => {
    const rows = art ? art.split("\n").length : 0
    const cols = art ? Math.max(...art.split("\n").map((l) => l.length)) : 0
    const chars = art ? [...art].filter((c) => c !== " " && c !== "\n").length : 0
    return { rows, cols, chars }
  }, [art])

  const callEdge = async () => {
    setEdgeLoading(true)
    try {
      const res = await fetch("/bigword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, target, cols: density }),
      })
      const data = await res.json()
      setEdgeResult({
        art: data.art || "",
        rows: data.rows || 0,
        cols: data.cols || 0,
        chars: data.chars || 0,
        generatedAt: data.generatedAt || 0,
        runtime: data.runtime || "python@edge",
        region: data.region,
      })
      setTab("edge")
    } catch {
      setEdgeResult({
        art: "// 边缘函数调用失败，请通过 `edgeone pages dev` 启动本地环境后重试。",
        rows: 0,
        cols: 0,
        chars: 0,
        generatedAt: Date.now(),
        runtime: "error",
      })
    } finally {
      setEdgeLoading(false)
    }
  }

  const handleCopy = async () => {
    const text = tab === "edge" ? edgeResult?.art ?? "" : art
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const handleDownload = () => {
    const text = tab === "edge" ? edgeResult?.art ?? "" : art
    if (!text) return
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bigword-${target || "output"}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleShuffle = () => {
    setSource((s) =>
      [...s]
        .map((c) => ({ c, k: Math.random() }))
        .sort((a, b) => a.k - b.k)
        .map((x) => x.c)
        .join(""),
    )
  }

  const handleReset = () => {
    setSource("Hello EdgeOne!")
    setTarget("HI")
    setDensity(120)
    setFontSize(10)
    setTargetFontId("sans")
    setSourceFontId("mono")
    setTextColor("#e5e7eb")
  }

  const applyPreset = (p: { source: string; target: string; font: string }) => {
    setSource(p.source)
    setTarget(p.target)
    setTargetFontId(p.font)
  }

  const displayArt = tab === "edge" ? edgeResult?.art ?? "" : art
  const displayStats =
    tab === "edge" && edgeResult
      ? { rows: edgeResult.rows, cols: edgeResult.cols, chars: edgeResult.chars }
      : stats

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="grid-background" />
      <div className="gradient-orb gradient-orb-primary w-[600px] h-[600px] -top-[200px] -left-[150px] animate-pulse-glow" />
      <div className="gradient-orb gradient-orb-secondary w-[400px] h-[400px] top-[40%] -right-[100px] animate-pulse-glow animation-delay-200" />

      {/* Header */}
      <header className="header-border relative z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#3776AB]/20 border border-[#3776AB]/30 flex items-center justify-center">
                <Type className="w-4 h-4 text-[#3776AB]" />
              </div>
              <span className="font-bold text-lg tracking-tight">BigWord</span>
              <span className="text-xs text-gray-500 hidden sm:inline">· 文本拼字艺术</span>
            </div>
            <a
              href="https://github.com/sxwzxc/bigword"
              target="_blank"
              rel="noopener noreferrer"
              className="icon-glow text-gray-400 hover:text-[#3776AB] transition-colors p-2"
              aria-label="GitHub"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 md:py-14 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center space-y-3 mb-10 animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#3776AB] via-[#5A9FD4] to-[#FFD43B]">
                用字符，拼出大字
              </span>
            </h1>
            <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
              输入<span className="text-[#3776AB]">素材文本</span>与
              <span className="text-[#FFD43B]">目标文本</span>，系统将素材字符重复排列，
              在视觉上还原目标文本的形态 —— 一种 ASCII Art 风格的拼字效果。
            </p>
          </div>

          {/* Workspace: left controls / right preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left column — inputs + typography */}
            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
              {/* Inputs */}
              <Card className="glass-card border-0 animate-fade-in-up animation-delay-100">
                <CardContent className="p-5 space-y-4">
                  {/* Source */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="label-pill">
                        <Sparkles className="w-3.5 h-3.5" />
                        素材文本
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="stat-chip">
                          <Hash className="w-3 h-3" />
                          {[...source.replace(/\s+/g, "")].length}
                        </span>
                        <button
                          onClick={handleShuffle}
                          className="text-gray-400 hover:text-[#FFD43B] transition-colors p-1.5 rounded hover:bg-white/5 cursor-pointer"
                          title="打乱素材顺序"
                          aria-label="打乱素材顺序"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="tool-textarea"
                      rows={3}
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="作为字符来源的文本，例如：Hello EdgeOne!"
                    />
                  </div>

                  {/* Target */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="label-pill" style={{ color: "#5A9FD4" }}>
                        <Type className="w-3.5 h-3.5" />
                        目标文本
                      </span>
                      <span className="stat-chip">
                        <Type className="w-3 h-3" />
                        {target.length}
                      </span>
                    </div>
                    <textarea
                      className="tool-textarea"
                      rows={2}
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      placeholder="最终要呈现的内容，例如：HI"
                    />
                  </div>

                  {/* Presets */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => applyPreset(p)}
                        className="px-2.5 py-1 rounded-md text-xs font-mono border border-[#3776AB]/20 bg-[#3776AB]/5 text-gray-300 hover:border-[#3776AB]/50 hover:text-white transition-colors cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      onClick={handleReset}
                      className="ml-auto px-2.5 py-1 rounded-md text-xs text-gray-500 hover:text-[#3776AB] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      重置
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Typography controls */}
              <Card className="glass-card border-0 animate-fade-in-up animation-delay-200">
                <CardContent className="p-5 space-y-5">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-gray-500">
                    <Palette className="w-3.5 h-3.5" />
                    排版设置
                  </div>

                  {/* Target font */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 flex items-center justify-between">
                      <span>目标字体 <span className="text-gray-600">· 决定大字形状</span></span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TARGET_FONTS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setTargetFontId(f.id)}
                          className={`seg-btn ${targetFontId === f.id ? "seg-btn-active" : ""}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source font */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 flex items-center justify-between">
                      <span>素材字体 <span className="text-gray-600">· 等宽，决定小字观感</span></span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SOURCE_FONTS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setSourceFontId(f.id)}
                          className={`seg-btn ${sourceFontId === f.id ? "seg-btn-active" : ""}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Density + font size */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400 flex items-center gap-1.5">
                          <Grid3x3 className="w-3.5 h-3.5 text-[#3776AB]" />
                          输出密度
                        </label>
                        <span className="stat-chip">{density}</span>
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={240}
                        step={2}
                        value={density}
                        onChange={(e) => setDensity(Number(e.target.value))}
                        className="tool-slider"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400 flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5 text-[#FFD43B]" />
                          字号
                        </label>
                        <span className="stat-chip">{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={24}
                        step={1}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="tool-slider"
                      />
                    </div>
                  </div>

                  {/* Text color */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">文字颜色</label>
                    <div className="flex flex-wrap gap-2">
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setTextColor(c.value)}
                          className={`color-swatch ${textColor === c.value ? "color-swatch-active" : ""}`}
                          style={{ backgroundColor: c.value }}
                          aria-label={`颜色 ${c.id}`}
                        >
                          {textColor === c.value && <Check className="w-3 h-3 text-black/60" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column — preview */}
            <div className="lg:col-span-7 animate-fade-in-up animation-delay-300">
              <Card className="glass-card border-0">
                <CardContent className="p-5">
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        className={`tab-btn ${tab === "live" ? "active" : ""}`}
                        onClick={() => setTab("live")}
                      >
                        <Zap className="w-3.5 h-3.5 inline mr-1" />
                        实时预览
                      </button>
                      <button
                        className={`tab-btn ${tab === "edge" ? "active" : ""}`}
                        onClick={() => edgeResult && setTab("edge")}
                        style={!edgeResult ? { opacity: 0.5 } : undefined}
                      >
                        <Cloud className="w-3.5 h-3.5 inline mr-1" />
                        边缘渲染
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="stat-chip">行 {displayStats.rows}</span>
                      <span className="stat-chip">列 {displayStats.cols}</span>
                      <span className="stat-chip">字符 {displayStats.chars}</span>
                      <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block" />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopy}
                        disabled={!displayArt}
                        className="text-gray-400 hover:text-white cursor-pointer h-8"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 mr-1 text-[#4ade80]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        {copied ? "已复制" : "复制"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDownload}
                        disabled={!displayArt}
                        className="text-gray-400 hover:text-white cursor-pointer h-8"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        下载
                      </Button>
                    </div>
                  </div>

                  {/* Edge banner */}
                  {tab === "edge" && edgeResult && (
                    <div className="edge-banner mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-[#FFD43B]">⚡ {edgeResult.runtime}</span>
                      <span>生成于 {new Date(edgeResult.generatedAt).toLocaleTimeString("zh-CN")}</span>
                      {edgeResult.region && <span>节点 {edgeResult.region}</span>}
                      <span className="text-gray-500">— 纯 Python 点阵字库，零依赖，边缘节点运行</span>
                    </div>
                  )}

                  {/* Preview canvas */}
                  <div className="preview-wrap" style={{ maxHeight: "62vh" }}>
                    {displayArt ? (
                      <pre
                        className="preview-canvas"
                        style={{
                          fontSize: `${fontSize}px`,
                          fontFamily: sourceFont.stack,
                          color: textColor,
                        }}
                      >
                        {displayArt}
                      </pre>
                    ) : (
                      <div className="preview-empty">
                        <Type className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                        <p>输入素材文本与目标文本，开始生成拼字效果</p>
                      </div>
                    )}
                  </div>

                  {/* Footer of preview */}
                  <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      实时预览基于浏览器 Canvas 像素采样（高保真，支持中文）；
                      边缘渲染通过 EdgeOne 边缘函数生成（纯 Python，可作 API 调用）。
                    </p>
                    <Button
                      onClick={callEdge}
                      disabled={edgeLoading}
                      className="btn-primary rounded cursor-pointer shrink-0"
                      size="sm"
                    >
                      {edgeLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Cloud className="w-4 h-4 mr-2" />
                      )}
                      调用边缘函数
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
            <div className="feature-card p-5 animate-fade-in-up animation-delay-100">
              <div className="w-10 h-10 mb-4 rounded-lg bg-[#3776AB]/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#3776AB]" />
              </div>
              <h3 className="font-semibold mb-2">像素级对齐</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                动态测量素材字体的真实字符宽高比，采样网格与显示网格严格一致，拼字无错位
              </p>
            </div>
            <div className="feature-card p-5 animate-fade-in-up animation-delay-200">
              <div className="w-10 h-10 mb-4 rounded-lg bg-[#3776AB]/15 flex items-center justify-center">
                <Palette className="w-5 h-5 text-[#FFD43B]" />
              </div>
              <h3 className="font-semibold mb-2">双字体可控</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                目标字体决定大字形态，素材字体决定小字观感，密度字号颜色自由调节
              </p>
            </div>
            <div className="feature-card p-5 animate-fade-in-up animation-delay-300">
              <div className="w-10 h-10 mb-4 rounded-lg bg-[#3776AB]/15 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-[#FFD43B]" />
              </div>
              <h3 className="font-semibold mb-2">边缘算力</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                EdgeOne 边缘函数纯 Python 生成，就近节点，零依赖部署，可作 API 调用
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer-border relative z-10 mt-12">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
            <span>Powered by</span>
            <a
              href="https://pages.edgeone.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#3776AB] transition-colors flex items-center gap-1"
            >
              <Cloud className="w-4 h-4" />
              EdgeOne Pages
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
