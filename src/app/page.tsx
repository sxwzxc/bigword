"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "lucide-react"

/* ============================================================
   Core: render target text with characters from source text.
   Uses an offscreen Canvas to rasterize the target, then samples
   the pixels on a grid. Dark pixels (text) → next source char,
   light pixels (background) → space.
   ============================================================ */

const CHAR_ASPECT = 2.1 // height/width of a monospace cell

function generateBigWord(source: string, target: string, density: number): string {
  const src = [...source.replace(/\s+/g, "")]
  const tgt = target
  if (src.length === 0 || tgt.trim().length === 0) return ""

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  const baseFont = 300
  const fontStack = `900 ${baseFont}px Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`
  ctx.font = fontStack

  const lines = tgt.split("\n")
  const lineH = baseFont * 1.25
  const padding = Math.round(baseFont * 0.25)
  let maxW = 0
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l || " ").width)

  canvas.width = Math.ceil(maxW + padding * 2)
  canvas.height = Math.ceil(lineH * lines.length + padding * 2)

  // canvas resize resets context state — re-apply
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "#000000"
  ctx.font = fontStack
  ctx.textBaseline = "top"
  lines.forEach((l, i) => ctx.fillText(l, padding, padding + i * lineH))

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const cols = Math.max(8, Math.round(density))
  const cellW = canvas.width / cols
  const cellH = cellW * CHAR_ASPECT
  const rows = Math.ceil(canvas.height / cellH)

  const out: string[] = []
  let idx = 0
  for (let r = 0; r < rows; r++) {
    const rowChars: string[] = []
    for (let c = 0; c < cols; c++) {
      const x = Math.floor((c + 0.5) * cellW)
      const y = Math.floor((r + 0.5) * cellH)
      let bright = 255
      if (x < canvas.width && y < canvas.height) {
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
    // trim trailing spaces per row to keep output compact
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
   Presets
   ============================================================ */

const PRESETS: { source: string; target: string; label: string }[] = [
  { source: "Hello World!", target: "HI", label: "HI" },
  { source: "EdgeOne Edge Function Python Cloud", target: "EDGE", label: "EDGE" },
  { source: "用字符堆叠出大字的视觉效果拼字艺术", target: "大字", label: "大字" },
  { source: "0123456789", target: "2026", label: "2026" },
]

export default function Home() {
  const [source, setSource] = useState("Hello EdgeOne!")
  const [target, setTarget] = useState("HI")
  const [density, setDensity] = useState(110)
  const [fontSize, setFontSize] = useState(9)
  const [art, setArt] = useState("")
  const [tab, setTab] = useState<"live" | "edge">("live")
  const [edgeResult, setEdgeResult] = useState<EdgeResult | null>(null)
  const [edgeLoading, setEdgeLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced real-time preview
  const recompute = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setArt(generateBigWord(source, target, density))
    }, 110)
  }, [source, target, density])

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
    setSource((s) => [...s].sort(() => Math.random() - 0.5).join(""))
  }

  const handleReset = () => {
    setSource("Hello EdgeOne!")
    setTarget("HI")
    setDensity(110)
    setFontSize(9)
  }

  const applyPreset = (p: { source: string; target: string }) => {
    setSource(p.source)
    setTarget(p.target)
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

      <main className="container mx-auto px-6 py-12 relative z-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Hero */}
          <div className="text-center space-y-4 animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#3776AB] via-[#5A9FD4] to-[#FFD43B]">
                用字符，拼出大字
              </span>
            </h1>
            <p className="text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
              输入<span className="text-[#3776AB]">素材文本</span>与
              <span className="text-[#FFD43B]">目标文本</span>，系统将素材字符重复排列，
              在视觉上还原目标文本的形态 —— 一种 ASCII Art 风格的拼字效果。
            </p>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 justify-center animate-fade-in-up animation-delay-100">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs font-mono border border-[#3776AB]/20 bg-[#3776AB]/5 text-gray-300 hover:border-[#3776AB]/50 hover:text-white transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-in-up animation-delay-200">
            <Card className="glass-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-300">
                  <span className="label-pill">
                    <Sparkles className="w-3.5 h-3.5" />
                    素材文本
                  </span>
                  <span className="text-gray-500 text-xs font-normal">Source · 构成元素</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  className="tool-textarea"
                  rows={4}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="作为字符来源的文本，例如：Hello EdgeOne!"
                />
                <div className="flex items-center justify-between">
                  <span className="stat-chip">
                    <Hash className="w-3 h-3" />
                    {[...source.replace(/\s+/g, "")].length} 字符
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleShuffle}
                      className="text-gray-400 hover:text-[#FFD43B] cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5 mr-1" />
                      打乱
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-300">
                  <span className="label-pill" style={{ color: "#5A9FD4" }}>
                    <Type className="w-3.5 h-3.5" />
                    目标文本
                  </span>
                  <span className="text-gray-500 text-xs font-normal">Target · 还原内容</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  className="tool-textarea"
                  rows={4}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="最终要呈现的内容，例如：HI"
                />
                <div className="flex items-center justify-between">
                  <span className="stat-chip">
                    <Type className="w-3 h-3" />
                    {target.length} 字符
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleReset}
                    className="text-gray-400 hover:text-[#3776AB] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    重置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card className="glass-card border-0 animate-fade-in-up animation-delay-200">
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-300 flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4 text-[#3776AB]" />
                      输出密度
                    </label>
                    <span className="stat-chip">{density} 列</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={220}
                    step={2}
                    value={density}
                    onChange={(e) => setDensity(Number(e.target.value))}
                    className="tool-slider"
                  />
                  <p className="text-xs text-gray-500">列数越多，拼字越精细，输出越大</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-300 flex items-center gap-2">
                      <Type className="w-4 h-4 text-[#FFD43B]" />
                      字体大小
                    </label>
                    <span className="stat-chip">{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={22}
                    step={1}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="tool-slider"
                  />
                  <p className="text-xs text-gray-500">预览区每个小字符的显示字号</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="glass-card border-0 animate-fade-in-up animation-delay-300">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-2">
                  <span className="stat-chip hidden sm:inline-flex">行 {displayStats.rows}</span>
                  <span className="stat-chip hidden sm:inline-flex">列 {displayStats.cols}</span>
                  <span className="stat-chip">字符 {displayStats.chars}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    disabled={!displayArt}
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    {copied ? "已复制" : "复制"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDownload}
                    disabled={!displayArt}
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    下载
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tab === "edge" && edgeResult && (
                <div className="edge-banner mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-[#FFD43B]">⚡ {edgeResult.runtime}</span>
                  <span>生成于 {new Date(edgeResult.generatedAt).toLocaleTimeString("zh-CN")}</span>
                  {edgeResult.region && <span>节点 {edgeResult.region}</span>}
                  <span className="text-gray-500">— 纯 Python 点阵字库，零依赖，边缘节点运行</span>
                </div>
              )}

              <div className="preview-wrap" style={{ maxHeight: "60vh" }}>
                {displayArt ? (
                  <pre
                    className="preview-canvas"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {displayArt}
                  </pre>
                ) : (
                  <div className="preview-empty">
                    请输入素材文本与目标文本以生成拼字效果
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs text-gray-500 leading-relaxed">
                  实时预览基于浏览器 Canvas 渲染（高保真，支持中文）；
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
                  调用边缘函数渲染
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
            <div className="feature-card p-5 animate-fade-in-up animation-delay-100">
              <div className="w-10 h-10 mb-4 rounded-lg bg-[#3776AB]/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#3776AB]" />
              </div>
              <h3 className="font-semibold mb-2">实时预览</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Canvas 像素采样，输入即变，支持中英文与多行目标文本
              </p>
            </div>
            <div className="feature-card p-5 animate-fade-in-up animation-delay-200">
              <div className="w-10 h-10 mb-4 rounded-lg bg-[#3776AB]/15 flex items-center justify-center">
                <Grid3x3 className="w-5 h-5 text-[#FFD43B]" />
              </div>
              <h3 className="font-semibold mb-2">密度可调</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                自定义输出列数与字号，从粗犷到精细自由切换
              </p>
            </div>
            <div className="feature-card p-5 animate-fade-in-up animation-delay-300">
              <div className="w-10 h-10 mb-4 rounded-lg bg-[#3776AB]/15 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-[#FFD43B]" />
              </div>
              <h3 className="font-semibold mb-2">边缘算力</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                EdgeOne 边缘函数纯 Python 生成，就近节点，零依赖部署
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer-border relative z-10 mt-12">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <span>Powered by</span>
            <a
              href="https://pages.edgeone.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#3776AB] transition-colors flex items-center gap-1"
            >
              <img src="/eo-logo-blue.svg" alt="EdgeOne" width={16} height={16} />
              EdgeOne Pages
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
