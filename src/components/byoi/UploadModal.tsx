'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, X, FileText, ShieldCheck, ShieldAlert, AlertCircle,
  CheckCircle2, Loader2, XCircle, FlaskConical, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TraceStep } from '@/components/agent/TracePanel'
import type { DecisionResult } from '@/components/agent/DecisionOutput'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Phase = 'idle' | 'uploading' | 'extracting' | 'running' | 'done' | 'error'

interface SyntheticInfo {
  discrepancy_type: 'PRICE_VARIANCE' | 'QTY_SHORT' | 'UNAUTHORIZED_ITEM'
  description: string
  po_number: string
}

interface ExtractedInfo {
  vendor_name: string
  invoice_number: string
  line_item_count: number
  currency: string
}

// ---------------------------------------------------------------------------
// SSE stream consumer
// ---------------------------------------------------------------------------
async function streamByoi(
  file: File,
  onPhase:     (p: Phase) => void,
  onExtracted: (e: ExtractedInfo) => void,
  onSynthetic: (s: SyntheticInfo) => void,
  onStep:      (s: TraceStep) => void,
  onResult:    (r: DecisionResult) => void,
): Promise<void> {
  const form = new FormData()
  form.append('file', file)

  onPhase('uploading')
  const res = await fetch('/api/agent/byoi', { method: 'POST', body: form })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (!res.body) throw new Error('No response body')

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const chunks = buf.split('\n\n')
    buf = chunks.pop() ?? ''

    for (const chunk of chunks) {
      const line = chunk.trim()
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'status' && data.message?.includes('Extracting')) onPhase('extracting')
        else if (data.type === 'extracted') onExtracted(data as ExtractedInfo)
        else if (data.type === 'synthetic')  onSynthetic(data as SyntheticInfo)
        else if (data.type === 'step') {
          onPhase('running')
          onStep({ step: data.step, label: data.label, detail: data.detail, status: data.status, ts: data.ts })
        }
        else if (data.type === 'result') onResult(data as DecisionResult)
        else if (data.type === 'done')   onPhase('done')
        else if (data.type === 'error')  throw new Error(data.message)
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Status icon for trace steps
// ---------------------------------------------------------------------------
const STEP_ICON: Record<string, React.ReactNode> = {
  running: <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />,
  done:    <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
  error:   <XCircle className="h-3 w-3 text-red-500" />,
}

const RESULT_CONFIG = {
  APPROVED:  { icon: ShieldCheck,  label: 'Approved',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  FLAGGED:   { icon: ShieldAlert,  label: 'Flagged',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30' },
  ESCALATED: { icon: AlertCircle,  label: 'Escalated', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30' },
}

const DISCREPANCY_LABEL: Record<string, string> = {
  PRICE_VARIANCE:    'Price variance injected',
  QTY_SHORT:        'Quantity shortage injected',
  UNAUTHORIZED_ITEM: 'Unauthorized line item injected',
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
interface UploadModalProps {
  onClose: () => void
}

export function UploadModal({ onClose }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [phase,      setPhase]      = useState<Phase>('idle')
  const [error,      setError]      = useState<string | null>(null)
  const [extracted,  setExtracted]  = useState<ExtractedInfo | null>(null)
  const [synthetic,  setSynthetic]  = useState<SyntheticInfo | null>(null)
  const [steps,      setSteps]      = useState<TraceStep[]>([])
  const [result,     setResult]     = useState<DecisionResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const applyStep = useCallback((incoming: TraceStep) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.step === incoming.step)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = incoming
        return next
      }
      return [...prev, incoming]
    })
  }, [])

  const run = useCallback(async (file: File) => {
    setError(null)
    setExtracted(null)
    setSynthetic(null)
    setSteps([])
    setResult(null)

    try {
      await streamByoi(
        file,
        setPhase,
        setExtracted,
        setSynthetic,
        applyStep,
        setResult,
      )
    } catch (err) {
      setPhase('error')
      setError(String(err))
    }
  }, [applyStep])

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Unsupported file type. Upload a PDF, JPEG, PNG, or WEBP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File exceeds 10 MB limit.')
      return
    }
    run(file)
  }, [run])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const isIdle = phase === 'idle'
  const isDone = phase === 'done'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative mx-4 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Bring Your Own Invoice</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <AnimatePresence mode="wait">

            {/* ── Idle: drop zone ── */}
            {isIdle && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Demo notice */}
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-[11px] text-zinc-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>
                    A <strong className="text-zinc-300">synthetic PO + WMS</strong> will be generated from your invoice
                    with one intentional discrepancy so the agent has something to find.
                  </span>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors',
                    isDragging
                      ? 'border-emerald-500/60 bg-emerald-500/5'
                      : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/40',
                  )}
                >
                  <FileText className={cn('h-8 w-8', isDragging ? 'text-emerald-400' : 'text-zinc-400')} />
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-300">
                      {isDragging ? 'Drop to upload' : 'Drop invoice here'}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-400">PDF, JPEG, PNG or WEBP · max 10 MB</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
                    Browse file
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={e => handleFile(e.target.files?.[0])}
                  />
                </div>

                {error && (
                  <p className="mt-3 text-center text-xs text-red-400">{error}</p>
                )}
              </motion.div>
            )}

            {/* ── In-progress / done ── */}
            {!isIdle && (
              <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                {/* Extraction summary */}
                <AnimatePresence>
                  {extracted && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
                    >
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Extracted</p>
                      <p className="text-xs font-semibold text-zinc-200">{extracted.vendor_name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {extracted.invoice_number} · {extracted.line_item_count} line item{extracted.line_item_count !== 1 ? 's' : ''} · {extracted.currency}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Synthetic badge */}
                <AnimatePresence>
                  {synthetic && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
                    >
                      <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                      <div>
                        <p className="text-[11px] font-semibold text-amber-300">
                          {DISCREPANCY_LABEL[synthetic.discrepancy_type]} · PO {synthetic.po_number}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">{synthetic.description}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Trace steps */}
                {steps.length > 0 && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Agent Trace</p>
                    <ol className="space-y-1.5">
                      <AnimatePresence initial={false}>
                        {steps.map(s => (
                          <motion.li
                            key={s.step}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-2"
                          >
                            <span className="shrink-0">{STEP_ICON[s.status]}</span>
                            <span className={cn(
                              'font-mono text-[11px]',
                              s.status === 'running' ? 'text-emerald-300' :
                              s.status === 'error'   ? 'text-red-400' : 'text-zinc-400',
                            )}>
                              {s.label}
                            </span>
                            {s.detail && (
                              <span className="truncate text-[10px] text-zinc-400">{s.detail}</span>
                            )}
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ol>
                  </div>
                )}

                {/* Loading states when no steps yet */}
                {steps.length === 0 && phase !== 'done' && phase !== 'error' && (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {phase === 'uploading'  ? 'Uploading…' :
                     phase === 'extracting' ? 'Extracting invoice data…' : 'Preparing…'}
                  </div>
                )}

                {/* Result */}
                <AnimatePresence>
                  {result && (() => {
                    const cfg = RESULT_CONFIG[result.status as keyof typeof RESULT_CONFIG]
                    const Icon = cfg.icon
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn('flex items-start gap-3 rounded-lg border p-3', cfg.bg)}
                      >
                        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', cfg.color)} />
                        <div className="min-w-0">
                          <p className={cn('text-sm font-bold', cfg.color)}>{cfg.label}</p>
                          {result.flag_reason && (
                            <p className="text-[10px] text-zinc-500">
                              {result.flag_reason.replace(/_/g, ' ')}
                            </p>
                          )}
                          <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                            {result.explanation}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-400">
                            Confidence: {Math.round(result.confidence * 100)}% · {(result.durationMs / 1000).toFixed(1)}s
                          </p>
                        </div>
                      </motion.div>
                    )
                  })()}
                </AnimatePresence>

                {/* Error */}
                {phase === 'error' && error && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                    {error}
                  </div>
                )}

                {/* Footer buttons */}
                {isDone && (
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setPhase('idle'); setSteps([]); setResult(null); setExtracted(null); setSynthetic(null) }}
                      className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      Try another
                    </Button>
                    <Button
                      size="sm"
                      onClick={onClose}
                      className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                    >
                      Done
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
