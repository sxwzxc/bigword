"use client"

import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Zap,
  Copy,
  Download,
  Image as ImageIcon,
  Shuffle,
  RotateCcw,
  Cloud,
  Sparkles,
  Type,
  Grid3x3,
  Hash,
  Palette,
  Check,
  Search,
  ScanLine,
  ChevronDown,
  X,
  PenTool,
} from "lucide-react"
import Link from "next/link"
import {
  FontDef,
  BUILTIN_FONTS,
  TEXT_COLORS,
  BG_COLORS,
  containsCJK,
  measureCellMetrics,
  generateBigWord,
} from "@/lib/bigword"


const PRESETS: { source: string; target: string; label: string; font: string; sourceFont?: string }[] = []


/* ============================================================
   Types
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
   Font Picker — portal-based popover
   ============================================================ */

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
    // Close on scroll OUTSIDE the popover; scrolling INSIDE the list should NOT close it
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

/* ============================================================
   Main Page
   ============================================================ */

export default function Home() {
  const [source, setSource] = useState("鳖鳖")
  const [target, setTarget] = useState("赖疙宝")
  const [fontSize, setFontSize] = useState(10)
  const [targetFontSize, setTargetFontSize] = useState(320)
  const [targetFontId, setTargetFontId] = useState("yahei")
  const [sourceFontId, setSourceFontId] = useState("yahei")
  const [textColor, setTextColor] = useState("#818cf8")
  const [bgColor, setBgColor] = useState("#0f172a")
  const [preventTruncation, setPreventTruncation] = useState(false)
  const [art, setArt] = useState("")
  const [tab, setTab] = useState<"live" | "edge">("live")
  const [edgeResult, setEdgeResult] = useState<EdgeResult | null>(null)
  const [edgeLoading, setEdgeLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const [systemFonts, setSystemFonts] = useState<FontDef[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allFonts = useMemo(() => [...BUILTIN_FONTS, ...systemFonts], [systemFonts])
  const targetFont = allFonts.find((f) => f.id === targetFontId) ?? BUILTIN_FONTS[0]
  const sourceFont = allFonts.find((f) => f.id === sourceFontId) ?? BUILTIN_FONTS[0]

  // Cheap CJK check on source text (no DOM, just code-point ranges)
  const hasCJK = useMemo(() => containsCJK(source), [source])

  // Measure cell metrics only when font or CJK status changes (not on every keystroke)
  const cellMetrics = useMemo(
    () => measureCellMetrics(sourceFont.stack, hasCJK),
    [sourceFont.stack, hasCJK],
  )

  const recompute = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setArt(generateBigWord(source, target, targetFont.stack, cellMetrics, targetFontSize, preventTruncation, hasCJK))
    }, 110)
  }, [source, target, targetFont.stack, cellMetrics, targetFontSize, preventTruncation, hasCJK])

  useEffect(() => {
    recompute()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [recompute])

  const stats = useMemo(() => {
    const rows = art ? art.split("\n").length : 0
    const cols = art ? Math.max(...art.split("\n").map((l) => [...l].length)) : 0
    // 统计非填充字符（排除空白单元的空格和全角空格，但保留素材中的空格难以区分，这里统计总字符数）
    const chars = art ? [...art].filter((c) => c !== "\n" && c !== "\u3000").length - (art.match(/ /g) || []).length : 0
    return { rows, cols, chars }
  }, [art])

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

  const callEdge = async () => {
    setEdgeLoading(true)
    try {
      const res = await fetch("/bigword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, target, cols: Math.round(targetFontSize * 0.375) }),
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
        art: "// 边缘函数调用失败，请通过 edgeone pages dev 启动本地环境后重试。",
        rows: 0, cols: 0, chars: 0, generatedAt: Date.now(), runtime: "error",
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
    } catch { /* ignore */ }
  }

  const handleDownloadTxt = () => {
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

  const handleExportPNG = () => {
    const text = tab === "edge" ? edgeResult?.art ?? "" : art
    if (!text) return
    const lines = text.split("\n")
    const maxCols = Math.max(...lines.map((l) => [...l].length))
    if (maxCols === 0) return

    // Render to an offscreen canvas
    const lineH = fontSize * 1.0
    // charAspect = cellH/cellW, so charW = fontSize / charAspect
    const charW = cellMetrics.charAspect ? fontSize / cellMetrics.charAspect : fontSize * 0.6
    const padding = 24
    const canvas = document.createElement("canvas")
    canvas.width = Math.ceil(maxCols * charW + padding * 2)
    canvas.height = Math.ceil(lines.length * lineH + padding * 2)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Text
    ctx.fillStyle = textColor
    ctx.font = `700 ${fontSize}px ${sourceFont.stack}`
    ctx.textBaseline = "top"
    ctx.textAlign = "left"
    lines.forEach((line, i) => {
      const chars = [...line]
      chars.forEach((ch, j) => {
        ctx.fillText(ch, padding + j * charW, padding + i * lineH)
      })
    })

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `bigword-${target || "output"}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, "image/png")
  }

  const handleShuffle = () => {
    setSource((s) =>
      [...s].map((c) => ({ c, k: Math.random() })).sort((a, b) => a.k - b.k).map((x) => x.c).join(""),
    )
  }

  const handleReset = () => {
    setSource("鳖鳖")
    setTarget("赖疙宝")
    setFontSize(10)
    setTargetFontSize(320)
    setTargetFontId("yahei")
    setSourceFontId("yahei")
    setTextColor("#818cf8")
    setBgColor("#0f172a")
    setPreventTruncation(false)
  }

  const applyPreset = (p: { source: string; target: string; font: string; sourceFont?: string }) => {
    setSource(p.source)
    setTarget(p.target)
    setTargetFontId(p.font)
    if (p.sourceFont) setSourceFontId(p.sourceFont)
  }

  const displayArt = tab === "edge" ? edgeResult?.art ?? "" : art
  const displayStats =
    tab === "edge" && edgeResult
      ? { rows: edgeResult.rows, cols: edgeResult.cols, chars: edgeResult.chars }
      : stats

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 relative">
      {/* Decorative gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-pink-300/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-amber-200/25 blur-3xl" />
      </div>

      {/* Header */}
      <header className="header-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
                <Type className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900">BigWord</span>
                <span className="text-xs text-slate-400 ml-1.5 hidden sm:inline">字符画</span>
              </div>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <Link
              href="/image"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-md shadow-pink-500/30">
                <PenTool className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">ImageForge</span>
              <span className="text-xs text-slate-400 ml-1 hidden sm:inline">像素画板</span>
            </Link>
            <Link
              href="/animate"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">动效字符</span>
              <span className="text-xs text-slate-400 ml-1 hidden sm:inline">Animated</span>
            </Link>
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
        {/* Hero */}
        <div className="text-center mb-6 animate-fade-in-up">
          <h1 className="text-4xl md:text-6xl font-black leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-pink-500 to-amber-500">
              字符画
            </span>
          </h1>
        </div>

        {/* Presets */}
        {PRESETS.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-6 animate-fade-in-up animation-delay-100">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold border border-slate-200 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer shadow-sm"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Controls — full width, horizontal layout */}
        <Card className="flat-card border-0 shadow-sm mb-5 animate-fade-in-up animation-delay-100">
          <CardContent className="p-5">
            {/* Row 1: Source | Target */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Source */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="label-pill" style={{ color: "#ec4899" }}>
                    <Sparkles className="w-3.5 h-3.5" />
                    素材文本
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="stat-chip">
                      <Hash className="w-3 h-3" />
                      {[...source.replace(/\s+/g, "")].length}
                    </span>
                    {hasCJK && (
                      <span className="stat-chip" style={{ background: "#fef3c7", border: "#fde68a", color: "#92400e" }}>
                        CJK
                      </span>
                    )}
                    <label className="flex items-center gap-1 cursor-pointer select-none text-xs text-slate-500 hover:text-indigo-600 transition-colors" title="勾选后以空格分割素材为词，每个词不会被截断">
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
                  <span className="label-pill" style={{ color: "#6366f1" }}>
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
                  rows={3}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="最终要呈现的内容，例如：HI"
                />
              </div>
            </div>

            {/* Row 2: Font pickers — 素材字体(左) | 目标字体(右), 始终同一行 */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Source font (left) */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-medium">
                  素材字体 <span className="text-slate-400">· 小字</span>
                </label>
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

              {/* Target font (right) */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-medium">
                  目标字体 <span className="text-slate-400">· 大字</span>
                </label>
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
            </div>

            {/* Row 2c: 小字字号 | 目标字号 — 始终同行 */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-amber-500" />
                    小字字号
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
                  className="tool-slider mt-2.5"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-indigo-500" />
                    目标字号
                  </label>
                  <span className="stat-chip">{targetFontSize}px</span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={600}
                  step={10}
                  value={targetFontSize}
                  onChange={(e) => setTargetFontSize(Number(e.target.value))}
                  className="tool-slider mt-2.5"
                />
              </div>
            </div>

            {/* Row 3: Colors + Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {/* Text color — 5 常用 + 自定义 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-pink-500" />
                    文字
                  </span>
                  <div className="flex gap-2">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setTextColor(c.value)}
                        className={`color-swatch ${textColor === c.value ? "color-swatch-active" : ""}`}
                        style={{ backgroundColor: c.value }}
                        aria-label={`文字颜色 ${c.id}`}
                      >
                        {textColor === c.value && <Check className="w-3.5 h-3.5 text-slate-800" />}
                      </button>
                    ))}
                    <label className="color-swatch cursor-pointer relative overflow-hidden" style={{ background: "conic-gradient(from 0deg, #f43f5e, #fbbf24, #34d399, #38bdf8, #a78bfa, #f43f5e)" }} aria-label="自定义文字颜色">
                      {TEXT_COLORS.every((c) => c.value !== textColor) && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow" style={{ filter: "drop-shadow(0 0 1px #000)" }} />
                      )}
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Background color — 5 常用 + 自定义 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <Grid3x3 className="w-3.5 h-3.5 text-slate-400" />
                    背景
                  </span>
                  <div className="flex gap-2">
                    {BG_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setBgColor(c.value)}
                        className={`color-swatch ${bgColor === c.value ? "color-swatch-active" : ""}`}
                        style={{ backgroundColor: c.value, border: c.value === "#ffffff" ? "2px solid #e2e8f0" : undefined }}
                        aria-label={`背景颜色 ${c.id}`}
                      >
                        {bgColor === c.value && (
                          <Check className={`w-3.5 h-3.5 ${c.value === "#ffffff" ? "text-slate-800" : "text-white"}`} />
                        )}
                      </button>
                    ))}
                    <label className="color-swatch cursor-pointer relative overflow-hidden" style={{ background: "conic-gradient(from 0deg, #f43f5e, #fbbf24, #34d399, #38bdf8, #a78bfa, #f43f5e)" }} aria-label="自定义背景颜色">
                      {BG_COLORS.every((c) => c.value !== bgColor) && (
                        <Check className="w-3.5 h-3.5 text-white" style={{ filter: "drop-shadow(0 0 1px #000)" }} />
                      )}
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-indigo-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置全部
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Preview — full width, taller */}
        <Card className="flat-card border-0 shadow-sm mb-10 animate-fade-in-up animation-delay-200">
          <CardContent className="p-5">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1.5">
                <button className={`tab-btn ${tab === "live" ? "active" : ""}`} onClick={() => setTab("live")}>
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
                <div className="w-px h-4 bg-slate-200 mx-0.5 hidden sm:block" />
                <Button
                  size="sm" variant="ghost" onClick={handleCopy} disabled={!displayArt}
                  className="text-slate-500 hover:text-indigo-600 cursor-pointer h-8"
                >
                  {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? "已复制" : "复制"}
                </Button>
                <Button
                  size="sm" variant="ghost" onClick={handleDownloadTxt} disabled={!displayArt}
                  className="text-slate-500 hover:text-indigo-600 cursor-pointer h-8"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  下载 TXT
                </Button>
                <Button
                  size="sm" variant="ghost" onClick={handleExportPNG} disabled={!displayArt}
                  className="text-slate-500 hover:text-indigo-600 cursor-pointer h-8"
                >
                  <ImageIcon className="w-3.5 h-3.5 mr-1" />
                  导出 PNG
                </Button>
              </div>
            </div>

            {/* Edge banner */}
            {tab === "edge" && edgeResult && (
              <div className="edge-banner mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-amber-600 font-bold">⚡ {edgeResult.runtime}</span>
                <span>生成于 {new Date(edgeResult.generatedAt).toLocaleTimeString("zh-CN")}</span>
                {edgeResult.region && <span>节点 {edgeResult.region}</span>}
                <span className="text-slate-400">— 纯 Python 点阵字库，零依赖，边缘节点运行</span>
              </div>
            )}

            {/* Preview area — taller for wider layout */}
            <div className="preview-wrap" style={{ maxHeight: "70vh", backgroundColor: bgColor }}>
              {displayArt ? (
                <pre
                  className="preview-canvas"
                  style={{ fontSize: `${fontSize}px`, fontFamily: sourceFont.stack, color: textColor }}
                >
                  {displayArt}
                </pre>
              ) : (
                <div className="preview-empty" style={{ color: bgColor === "#ffffff" ? "#64748b" : "#475569" }}>
                  <Type className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>输入素材文本与目标文本，开始生成拼字效果</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                实时预览基于浏览器 Canvas 像素采样（高保真，支持中英文，自动适配全角/半角字符宽度）；
                边缘渲染通过 EdgeOne 边缘函数生成（纯 Python，可作 API 调用）。
              </p>
              <Button
                onClick={callEdge} disabled={edgeLoading}
                className="btn-primary rounded-lg cursor-pointer shrink-0" size="sm"
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

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="feature-card p-5 animate-fade-in-up animation-delay-100">
            <div className="w-11 h-11 mb-4 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-bold mb-2 text-slate-800">全角半角自适应</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              自动检测素材中的中文字符，测量全角字符宽度并使用全角空格对齐，中英文拼字均无错位
            </p>
          </div>
          <div className="feature-card p-5 animate-fade-in-up animation-delay-200">
            <div className="w-11 h-11 mb-4 rounded-xl bg-pink-100 flex items-center justify-center">
              <Palette className="w-5 h-5 text-pink-600" />
            </div>
            <h3 className="font-bold mb-2 text-slate-800">全字体可选</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              内置 30+ 中西文与等宽字体，支持扫描系统全部已安装字体，目标与素材双字体独立控制
            </p>
          </div>
          <div className="feature-card p-5 animate-fade-in-up animation-delay-300">
            <div className="w-11 h-11 mb-4 rounded-xl bg-amber-100 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-bold mb-2 text-slate-800">边缘算力</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              EdgeOne 边缘函数纯 Python 生成，就近节点，零依赖部署，可作 API 调用
            </p>
          </div>
        </div>

        {/* ImageForge CTA */}
        <div className="mt-10 text-center animate-fade-in-up animation-delay-300">
          <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <PenTool className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">想要更精细的控制？</h3>
              <p className="text-slate-500 text-sm">试试 ImageForge 像素画板 — 文字生成图片，像素级微调，导出完美作品</p>
            </div>
            <Link
              href="/image"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105"
            >
              <PenTool className="w-4 h-4" />
              打开 ImageForge
            </Link>
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
            <Cloud className="w-4 h-4" />
            EdgeOne Pages
          </a>
        </div>
      </footer>
    </div>
  )
}
