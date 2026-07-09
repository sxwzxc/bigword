"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  ANIMATE_FONTS,
  AnimatedBigText,
  type AnimKind,
  type AnimateOptions,
} from "@/lib/animate-text"
import { Zap, Download, Shuffle, Sparkles, PenTool, Type, Image as ImageIcon } from "lucide-react"

const ANIM_TYPES: { id: AnimKind; label: string }[] = [
  { id: "pulse", label: "随机缩放" },
  { id: "wave", label: "波浪起伏" },
  { id: "scroll", label: "纵向滚动(像素)" },
  { id: "drift", label: "随机飘动" },
  { id: "blink", label: "闪烁" },
  { id: "rainbow", label: "彩虹流光" },
  { id: "none", label: "静态" },
]

const TEXT_COLORS = ["#fbbf24", "#38bdf8", "#34d399", "#f472b6", "#ffffff", "#fb7185"]
const BG_COLORS = ["#0f172a", "#000000", "#1e1b4b", "#022c22", "#7c2d12", "#ffffff"]

export default function AnimatePage() {
  const [source, setSource] = useState("A")
  const [target, setTarget] = useState("B")
  const [targetFontId, setTargetFontId] = useState("arial")
  const [sourceFontId, setSourceFontId] = useState("arial")
  const [density, setDensity] = useState(64)
  const [anim, setAnim] = useState<AnimKind>("pulse")
  const [duration, setDuration] = useState(1.6)
  const [scale, setScale] = useState(1.7)
  const [textColor, setTextColor] = useState("#fbbf24")
  const [bgColor, setBgColor] = useState("#0f172a")
  const [stats, setStats] = useState({ cols: 0, rows: 0, count: 0 })

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<AnimatedBigText | null>(null)

  const targetFont = ANIMATE_FONTS.find((f) => f.id === targetFontId) ?? ANIMATE_FONTS[0]
  const sourceFont = ANIMATE_FONTS.find((f) => f.id === sourceFontId) ?? ANIMATE_FONTS[0]

  const buildOpts = useCallback(
    (): AnimateOptions => ({
      source,
      target,
      targetFontStack: targetFont.stack,
      sourceFontStack: sourceFont.stack,
      density,
      anim,
      duration,
      scale,
      textColor,
      bgColor,
    }),
    [source, target, targetFont.stack, sourceFont.stack, density, anim, duration, scale, textColor, bgColor],
  )

  // Mount: create engine, compute mask, start the rAF loop, observe resize.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new AnimatedBigText(canvas, buildOpts())
    engineRef.current = engine
    engine.compute()
    setStats(engine.stats)
    engine.start()

    const parent = canvas.parentElement
    const ro = new ResizeObserver(() => engine.resize())
    if (parent) ro.observe(parent)

    return () => {
      engine.stop()
      ro.disconnect()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recompute the mask only when geometry / text / fonts change.
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.setOptions(buildOpts())
    engine.compute()
    setStats(engine.stats)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, target, targetFontId, sourceFontId, density])

  // Live updates (no recompute) for animation parameters.
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.setOptions(buildOpts())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, duration, scale, textColor, bgColor])

  const handleShuffle = useCallback(() => {
    const arr = [...source]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    setSource(arr.join(""))
  }, [source])

  const handleDownload = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    const url = engine.toPNG()
    const a = document.createElement("a")
    a.href = url
    a.download = `动效字符-${target || "bigword"}.png`
    a.click()
  }, [target])

  const tooMany = stats.count > 6000
  const empty = target.trim().length === 0

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
                <span className="text-xs text-slate-400 ml-1.5 hidden sm:inline">Canvas Animated</span>
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
          <p className="mt-2 text-sm text-slate-500">
            用 Canvas 实时渲染：小文字拼出大文字，每个字都有独立动画 ✨
          </p>
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
                      <span className="stat-chip">{[...source.replace(/\s+/g, "")].length}</span>
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

                {/* Density */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">密度（列数）</span>
                    <span className="stat-chip">{density}</span>
                  </div>
                  <input
                    type="range"
                    className="tool-slider"
                    min={40}
                    max={160}
                    step={2}
                    value={density}
                    onChange={(e) => setDensity(Number(e.target.value))}
                  />
                </div>

                {/* Animation type */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">动画类型</span>
                  <div className="grid grid-cols-3 gap-2">
                    {ANIM_TYPES.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setAnim(a.id)}
                        className={`seg-btn ${anim === a.id ? "seg-btn-active" : ""}`}
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

                {/* Intensity (pulse / wave amplitude) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">强度（放大/起伏幅度）</span>
                    <span className="stat-chip">{scale.toFixed(2)}×</span>
                  </div>
                  <input
                    type="range"
                    className="tool-slider"
                    min={1}
                    max={2.4}
                    step={0.05}
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                  />
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500">文字颜色</span>
                    <div className="flex flex-wrap gap-2">
                      {TEXT_COLORS.map((c) => (
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
                      {BG_COLORS.map((c) => (
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
                    onClick={handleDownload}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)" }}
                  >
                    <Download className="w-4 h-4" />
                    下载图片
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
                    实时预览（Canvas 动画）
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="stat-chip">{stats.rows} 行</span>
                    <span className="stat-chip">{stats.cols} 列</span>
                    <span className="stat-chip">{stats.count} 字</span>
                  </div>
                </div>
                {tooMany && (
                  <div className="edge-banner mb-3">
                    单元格较多（{stats.count}），动画可能略卡。可在左侧降低「密度」。
                  </div>
                )}
                <div
                  className="preview-frame"
                  style={{
                    background: bgColor,
                    borderColor: bgColor === "#ffffff" ? "#e2e8f0" : "#1e293b",
                    borderRadius: 12,
                    border: "1px solid",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <canvas ref={canvasRef} />
                  {empty && (
                    <div
                      className="preview-empty"
                      style={{ color: bgColor === "#ffffff" ? "#94a3b8" : "#64748b", minHeight: 280 }}
                    >
                      输入目标文本即可生成动效字符
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-400 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" />
                  提示：每个暗格的小字由 requestAnimationFrame 逐帧绘制。底层有一层静止暗字保证大形状（B）始终清晰。「纵向滚动(像素)」用裁剪 + 连续亚像素偏移让素材字在格内平滑滚动；「随机飘动」让每个 A 在格内用双正弦伪随机游动并同步缩放，像在 B 内随机撞击（试试调大「强度」让幅度更夸张）。
                </p>
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
      {ANIMATE_FONTS.map((f) => (
        <option key={f.id} value={f.id}>
          {f.label}
        </option>
      ))}
    </select>
  )
}
