"use client"

import { useState, useEffect, useMemo, useCallback, type CSSProperties } from "react"
import Link from "next/link"
import {
  BUILTIN_FONTS,
  containsCJK,
  measureCellMetrics,
  buildAnimatedCells,
  toFullwidth,
  type AnimGrid,
  type AnimCell,
} from "@/lib/bigword"
import { Zap, Copy, Download, Shuffle, Sparkles, PenTool, Type } from "lucide-react"

const ANIM_TYPES = [
  { id: "pulse", label: "脉冲放大" },
  { id: "wave", label: "波浪起伏" },
  { id: "scroll", label: "纵向滚动" },
  { id: "blink", label: "闪烁" },
  { id: "rainbow", label: "彩虹流光" },
  { id: "none", label: "无动画" },
] as const

type AnimTypeId = (typeof ANIM_TYPES)[number]["id"]

export default function AnimatePage() {
  const [source, setSource] = useState("鳖鳖鳖")
  const [target, setTarget] = useState("赖疙宝")
  const [targetFontId, setTargetFontId] = useState("yahei")
  const [sourceFontId, setSourceFontId] = useState("yahei")
  const [targetBaseSize, setTargetBaseSize] = useState(180)
  const [animType, setAnimType] = useState<AnimTypeId>("pulse")
  const [duration, setDuration] = useState(1.6)
  const [textColor, setTextColor] = useState("#fbbf24")
  const [bgColor, setBgColor] = useState("#0f172a")
  const [grid, setGrid] = useState<AnimGrid>({ rows: 0, cols: 0, cells: [], charCount: 0 })
  const [copied, setCopied] = useState(false)

  const allFonts = BUILTIN_FONTS
  const targetFont = allFonts.find((f) => f.id === targetFontId) ?? BUILTIN_FONTS[0]
  const sourceFont = allFonts.find((f) => f.id === sourceFontId) ?? BUILTIN_FONTS[0]

  const hasCJK = useMemo(() => containsCJK(source), [source])
  const cellMetrics = useMemo(
    () => measureCellMetrics(sourceFont.stack, hasCJK),
    [sourceFont.stack, hasCJK],
  )

  // Scroll strip: cap to keep DOM node count reasonable, repeat twice for seamless loop.
  const scrollStrip = useMemo(() => {
    const conv = [...source].map((ch) => (hasCJK ? toFullwidth(ch) : ch)).filter((c) => c.trim().length > 0)
    const capped = conv.length > 0 ? conv.slice(0, 6) : ["●"]
    return [...capped, ...capped]
  }, [source, hasCJK])
  const scrollLen = scrollStrip.length / 2

  const recompute = useCallback(() => {
    setGrid(
      buildAnimatedCells(source, target, targetFont.stack, cellMetrics, targetBaseSize, hasCJK),
    )
  }, [source, target, targetFont.stack, cellMetrics, targetBaseSize, hasCJK])

  useEffect(() => {
    recompute()
  }, [recompute])

  const toPlainText = useCallback(() => {
    return grid.cells
      .map((row) => row.map((c) => (c.dark ? c.ch : " ")).join(""))
      .join("\n")
  }, [grid])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(toPlainText())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }, [toPlainText])

  const handleDownload = useCallback(() => {
    const blob = new Blob([toPlainText()], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `animated-${target || "bigword"}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [toPlainText, target])

  const handleShuffle = useCallback(() => {
    const arr = [...source]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    setSource(arr.join(""))
  }, [source])

  const renderCell = useCallback(
    (cell: AnimCell, r: number, c: number) => {
      if (!cell.dark) {
        return (
          <span key={c} className="asc-cell light">
            {cell.ch}
          </span>
        )
      }
      const delay = ((r + c) % 24) * 0.05

      if (animType === "scroll") {
        return (
          <span key={c} className="asc-cell asc-scroll" style={{ color: textColor }}>
            <span
              className="asc-strip"
              style={{
                animationDuration: `${duration * 2}s`,
                animationDelay: `${-delay}s`,
                "--asc-len": scrollLen,
              } as CSSProperties}
            >
              {scrollStrip.map((ch, i) => (
                <span key={i} className="asc-strip-ch">
                  {ch}
                </span>
              ))}
            </span>
          </span>
        )
      }

      const cls =
        animType === "pulse"
          ? "asc-pulse"
          : animType === "wave"
            ? "asc-wave"
            : animType === "blink"
              ? "asc-blink"
              : animType === "rainbow"
                ? "asc-rainbow"
                : ""

      return (
        <span
          key={c}
          className={`asc-cell dark ${cls}`}
          style={{ color: textColor, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
        >
          {cell.ch}
        </span>
      )
    },
    [animType, duration, textColor, scrollStrip, scrollLen],
  )

  const tooMany = grid.charCount > 3500

  return (
    <div className="min-h-screen">
      {/* Decorative gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-indigo-300/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-pink-200/25 blur-3xl" />
      </div>

      {/* Header */}
      <header className="header-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900">动效字符</span>
                <span className="text-xs text-slate-400 ml-1.5 hidden sm:inline">Animated</span>
              </div>
            </Link>
            <div className="w-px h-5 bg-slate-200" />
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
                <Type className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">BigWord</span>
            </Link>
            <Link href="/image" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md shadow-pink-500/30">
                <PenTool className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">ImageForge</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              by <span className="font-semibold text-slate-600">sxwzxc</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 py-6 md:py-12">
        <div className="text-center mb-6 animate-fade-in-up">
          <h1 className="text-4xl md:text-6xl font-black leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-pink-500 to-indigo-500">
              动效字符
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">用小文字拼出大文字，再给每个字加上动画 ✨</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
          {/* Controls */}
          <div className="animate-fade-in-up animation-delay-100">
            <div className="flat-card border-0 shadow-sm">
              <div className="p-5 space-y-4">
                {/* Source */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="label-pill" style={{ color: "#ec4899" }}>
                      <Sparkles className="w-3.5 h-3.5" />
                      素材文本
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="stat-chip">
                        {[...source.replace(/\s+/g, "")].length}
                      </span>
                      {hasCJK && <span className="stat-chip" style={{ background: "#fef3c7", border: "#fde68a", color: "#92400e" }}>CJK</span>}
                      <button
                        onClick={handleShuffle}
                        className="text-slate-400 hover:text-amber-500 transition-colors p-1.5 rounded-lg hover:bg-amber-50 cursor-pointer"
                        title="打乱素材顺序"
                        aria-label="打乱素材顺序"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="tool-textarea"
                    rows={2}
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="用于填充大文字的小文字，如 鳖鳖鳖"
                  />
                </div>

                {/* Target */}
                <div className="space-y-2">
                  <span className="label-pill" style={{ color: "#6366f1" }}>
                    <Type className="w-3.5 h-3.5" />
                    目标文本
                  </span>
                  <textarea
                    className="tool-textarea"
                    rows={2}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="要显示的大文字，如 赖疙宝"
                  />
                </div>

                {/* Fonts */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500">目标字体</span>
                    <FontSelect value={targetFontId} onChange={setTargetFontId} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500">素材字体</span>
                    <FontSelect value={sourceFontId} onChange={setSourceFontId} />
                  </div>
                </div>

                {/* Size */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">字号 / 密度</span>
                    <span className="stat-chip">{targetBaseSize}</span>
                  </div>
                  <input
                    type="range"
                    className="tool-slider"
                    min={80}
                    max={400}
                    step={10}
                    value={targetBaseSize}
                    onChange={(e) => setTargetBaseSize(Number(e.target.value))}
                  />
                </div>

                {/* Animation type */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">动画类型</span>
                  <div className="grid grid-cols-3 gap-2">
                    {ANIM_TYPES.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setAnimType(a.id)}
                        className={`seg-btn ${animType === a.id ? "seg-btn-active" : ""}`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">速度（周期秒）</span>
                    <span className="stat-chip">{duration.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    className="tool-slider"
                    min={0.4}
                    max={4}
                    step={0.1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500">文字颜色</span>
                    <div className="flex flex-wrap gap-2">
                      {["#fbbf24", "#38bdf8", "#34d399", "#f472b6", "#ffffff"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setTextColor(c)}
                          className={`color-swatch ${textColor === c ? "color-swatch-active" : ""}`}
                          style={{ background: c }}
                          aria-label={c}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500">背景颜色</span>
                    <div className="flex flex-wrap gap-2">
                      {["#0f172a", "#000000", "#1e1b4b", "#022c22", "#ffffff"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setBgColor(c)}
                          className={`color-swatch ${bgColor === c ? "color-swatch-active" : ""}`}
                          style={{ background: c }}
                          aria-label={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleCopy}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? "已复制" : "复制"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="animate-fade-in-up animation-delay-200">
            <div className="flat-card border-0 shadow-sm">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="label-pill">
                    <Zap className="w-3.5 h-3.5" />
                    预览
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="stat-chip">{grid.rows} 行</span>
                    <span className="stat-chip">{grid.cols} 列</span>
                    <span className="stat-chip">{grid.charCount} 字</span>
                  </div>
                </div>
                {tooMany && (
                  <div className="edge-banner mb-3">
                    单元格较多（{grid.charCount}），动画可能略卡。可在左侧降低「字号 / 密度」。
                  </div>
                )}
                <div className="asc-wrap" style={{ background: bgColor, borderColor: bgColor === "#ffffff" ? "#e2e8f0" : "#1e293b" }}>
                  <div className="asc-stage" style={{ background: bgColor }}>
                    {grid.rows === 0 ? (
                      <div className="preview-empty" style={{ color: bgColor === "#ffffff" ? "#94a3b8" : "#475569", minHeight: 280 }}>
                        输入素材文本与目标文本即可生成动效字符
                      </div>
                    ) : (
                      grid.cells.map((row, r) => (
                        <div className="asc-line" key={r}>
                          {row.map((cell, c) => renderCell(cell, r, c))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
    >
      {BUILTIN_FONTS.map((f) => (
        <option key={f.id} value={f.id}>
          {f.label}
        </option>
      ))}
    </select>
  )
}
