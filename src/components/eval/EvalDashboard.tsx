'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FlaskConical, Play, CheckCircle2, XCircle, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STATIC_SCENARIOS } from '@/data/scenarios-static'
import { cn } from '@/lib/utils'
import type { EvalMetrics, EvalRun } from '@/app/api/eval/run/route'

type MatchStatus = 'APPROVED' | 'FLAGGED' | 'ESCALATED'

// ---------------------------------------------------------------------------
// SSE consumer
// ---------------------------------------------------------------------------
interface ProgressState { done: number; total: number }

async function streamEval(
  onProgress: (p: ProgressState) => void,
  onResult:   (r: EvalRun) => void,
  onComplete: (m: EvalMetrics) => void,
): Promise<void> {
  const res = await fetch('/api/eval/run', { method: 'POST' })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

  const reader = res.body.getReader()
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
        if      (data.type === 'progress') onProgress({ done: data.done, total: data.total })
        else if (data.type === 'result')   onResult(data as EvalRun)
        else if (data.type === 'complete') onComplete(data.metrics as EvalMetrics)
      } catch { /* skip malformed */ }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pct(n: number) { return `${Math.round(n * 100)}%` }
function ms(n: number)  { return n < 1000 ? `${Math.round(n)}ms` : `${(n / 1000).toFixed(1)}s` }

const STATUS_COLOR: Record<MatchStatus, string> = {
  APPROVED:  'text-emerald-400',
  FLAGGED:   'text-red-400',
  ESCALATED: 'text-amber-400',
}

const STATUS_CHIP: Record<MatchStatus, string> = {
  APPROVED:  'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20',
  FLAGGED:   'bg-red-500/15 text-red-300 ring-1 ring-red-500/20',
  ESCALATED: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20',
}

// ---------------------------------------------------------------------------
// Stat chip — compact secondary metric
// ---------------------------------------------------------------------------
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3">
      <span className="text-xl font-bold text-white">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Accuracy hero
// ---------------------------------------------------------------------------
function AccuracyHero({ correct, total, accuracy }: { correct: number; total: number; accuracy: number }) {
  const pctNum = Math.round(accuracy * 100)
  const color  = pctNum >= 80 ? 'text-emerald-400' : pctNum >= 60 ? 'text-amber-400' : 'text-red-400'
  const ring   = pctNum >= 80 ? 'ring-emerald-500/30' : pctNum >= 60 ? 'ring-amber-500/30' : 'ring-red-500/30'

  return (
    <div className={cn('flex flex-col items-center justify-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 px-8 py-5 ring-1', ring)}>
      <motion.span
        key={pctNum}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cn('text-5xl font-black tabular-nums', color)}
      >
        {pctNum}%
      </motion.span>
      <span className="text-xs font-medium text-zinc-400">Accuracy</span>
      <span className="mt-1 text-[11px] text-zinc-500">
        <span className="font-semibold text-zinc-300">{correct}</span>/{total} correct
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confusion matrix
// ---------------------------------------------------------------------------
function ConfusionMatrix({ matrix }: { matrix: EvalMetrics['confusionMatrix'] }) {
  const classes: MatchStatus[] = ['APPROVED', 'FLAGGED', 'ESCALATED']
  const short: Record<MatchStatus, string> = { APPROVED: 'APR', FLAGGED: 'FLG', ESCALATED: 'ESC' }
  const max = Math.max(1, ...classes.flatMap(a => classes.map(p => matrix[a][p])))

  const diagBg   = (count: number) => count === 0 ? '' : `rgba(16,185,129,${0.08 + (count / max) * 0.25})`
  const offBg    = (count: number) => count === 0 ? '' : `rgba(239,68,68,${0.08 + (count / max) * 0.30})`

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Confusion Matrix
        <span className="ml-1.5 normal-case font-normal text-zinc-700">rows = actual · cols = predicted</span>
      </p>
      <table className="w-full text-center text-sm">
        <thead>
          <tr>
            <th className="pb-2 pr-3 text-left text-[10px] text-zinc-700" />
            {classes.map(c => (
              <th key={c} className={cn('pb-2 text-xs font-bold', STATUS_COLOR[c])}>{short[c]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {classes.map(actual => (
            <tr key={actual}>
              <td className={cn('py-1.5 pr-3 text-left text-xs font-bold', STATUS_COLOR[actual])}>{short[actual]}</td>
              {classes.map(pred => {
                const count  = matrix[actual][pred]
                const isDiag = actual === pred
                return (
                  <td key={pred} className="py-1 px-1">
                    <div
                      className="mx-auto flex h-10 w-14 items-center justify-center rounded-lg text-base font-black"
                      style={{ background: isDiag ? diagBg(count) : offBg(count) }}
                    >
                      <span className={cn(
                        isDiag
                          ? count > 0 ? 'text-emerald-300' : 'text-zinc-700'
                          : count > 0 ? 'text-red-400'     : 'text-zinc-800',
                      )}>
                        {count}
                      </span>
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Per-class table with mini F1 bar
// ---------------------------------------------------------------------------
function PerClassTable({ perClass }: { perClass: EvalMetrics['perClass'] }) {
  const classes: MatchStatus[] = ['APPROVED', 'FLAGGED', 'ESCALATED']
  const barColor: Record<MatchStatus, string> = {
    APPROVED:  'bg-emerald-500',
    FLAGGED:   'bg-red-500',
    ESCALATED: 'bg-amber-500',
  }

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Per-Class Metrics</p>
      <div className="space-y-3">
        {classes.map(cls => {
          const m = perClass[cls]
          return (
            <div key={cls} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className={cn('text-xs font-bold', STATUS_COLOR[cls])}>{cls}</span>
                <span className="text-[10px] text-zinc-600">{m.support} sample{m.support !== 1 ? 's' : ''}</span>
              </div>
              {/* F1 bar */}
              <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <motion.div
                  className={cn('h-full rounded-full', barColor[cls])}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(m.f1 * 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>P <span className="text-zinc-300 font-medium">{pct(m.precision)}</span></span>
                <span>R <span className="text-zinc-300 font-medium">{pct(m.recall)}</span></span>
                <span>F1 <span className="font-bold text-white">{pct(m.f1)}</span></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Per-scenario results
// ---------------------------------------------------------------------------
function RunsTable({ runs }: { runs: EvalRun[] }) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Per-Scenario Results</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {STATIC_SCENARIOS.map(scenario => {
          const run      = runs.find(r => r.scenarioId === scenario.id)
          const isPending = !run
          const isCorrect = run?.correct

          return (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2.5',
                isPending
                  ? 'border-zinc-800/60 bg-zinc-950/30'
                  : isCorrect
                    ? 'border-emerald-900/40 bg-emerald-950/20'
                    : 'border-red-900/40 bg-red-950/15',
              )}
            >
              {/* Icon */}
              <span className="shrink-0">
                {isPending
                  ? <Minus className="h-3.5 w-3.5 text-zinc-700" />
                  : isCorrect
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    : <XCircle className="h-3.5 w-3.5 text-red-500" />}
              </span>

              {/* Title */}
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-100">{scenario.title}</span>

              {/* Status chip(s) */}
              <div className="flex shrink-0 items-center gap-1">
                {run && run.actual !== run.expected ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-zinc-500">expected</span>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', STATUS_CHIP[scenario.ground_truth as MatchStatus])}>
                        {scenario.ground_truth}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-zinc-500">got</span>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', STATUS_CHIP[run.actual as MatchStatus])}>
                        {run.actual}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    run ? STATUS_CHIP[scenario.ground_truth as MatchStatus] : 'text-zinc-600',
                  )}>
                    {scenario.ground_truth}
                  </span>
                )}
              </div>

              {/* Confidence · latency */}
              {run && (
                <span className="shrink-0 font-mono text-[10px] text-zinc-400">
                  {pct(run.confidence)} · {ms(run.durationMs)}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export function EvalDashboard() {
  const [isRunning,    setIsRunning]    = useState(false)
  const [progress,     setProgress]     = useState<ProgressState | null>(null)
  const [partialRuns,  setPartialRuns]  = useState<EvalRun[]>([])
  const [metrics,      setMetrics]      = useState<EvalMetrics | null>(null)

  const runEval = useCallback(async () => {
    if (isRunning) return
    setIsRunning(true)
    setProgress({ done: 0, total: STATIC_SCENARIOS.length })
    setPartialRuns([])
    setMetrics(null)

    try {
      await streamEval(
        p  => setProgress(p),
        r  => {
          setPartialRuns(prev => [...prev, r])
          setProgress(prev => prev ? { ...prev, done: prev.done + 1 } : prev)
        },
        m  => setMetrics(m),
      )
    } catch (err) {
      console.error('Eval failed:', err)
    } finally {
      setIsRunning(false)
    }
  }, [isRunning])

  const runsToShow = metrics?.runs ?? partialRuns

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FlaskConical className="h-5 w-5 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-200">Eval Mode</h2>
          {metrics && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
              {metrics.correct}/{metrics.total} correct
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={runEval}
          disabled={isRunning}
          className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          <Play className="mr-1.5 h-3.5 w-3.5" />
          {isRunning ? 'Running…' : metrics ? 'Re-run Eval' : 'Run Eval'}
        </Button>
      </div>

      {/* ── Progress bar ── */}
      <AnimatePresence>
        {isRunning && progress && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1,  y:  0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-zinc-400">
                {progress.done < progress.total
                  ? `Running scenario ${progress.done + 1} of ${progress.total}…`
                  : 'Computing metrics…'}
              </span>
              <span className="font-mono text-zinc-600">{progress.done}/{progress.total}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                animate={{ width: `${(progress.done / progress.total) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            {runsToShow.length > 0 && (
              <div className="mt-4">
                <RunsTable runs={runsToShow} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ── */}
      <AnimatePresence>
        {metrics && !isRunning && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            {/* Hero + stat chips */}
            <div className="flex flex-wrap items-stretch gap-3">
              <AccuracyHero
                correct={metrics.correct}
                total={metrics.total}
                accuracy={metrics.accuracy}
              />
              <div className="flex flex-1 flex-wrap gap-3">
                <StatChip label="Macro F1"       value={pct(metrics.macroF1)} />
                <StatChip label="Avg Confidence" value={pct(metrics.avgConfidence)} />
                <StatChip label="p50 Latency"    value={ms(metrics.p50LatencyMs)} />
                <StatChip label="p95 Latency"    value={ms(metrics.p95LatencyMs)} />
                <StatChip label="Incorrect"      value={String(metrics.total - metrics.correct)} />
              </div>
            </div>

            {/* Confusion matrix + per-class */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <ConfusionMatrix matrix={metrics.confusionMatrix} />
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <PerClassTable perClass={metrics.perClass} />
              </div>
            </div>

            {/* Per-scenario */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <RunsTable runs={metrics.runs} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Idle ── */}
      {!isRunning && !metrics && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center">
          <FlaskConical className="mx-auto mb-3 h-9 w-9 text-zinc-700" />
          <p className="text-sm text-zinc-400">
            Click <span className="font-semibold text-zinc-200">Run Eval</span> to benchmark the agent
            against all {STATIC_SCENARIOS.length} ground-truth scenarios.
          </p>
          <p className="mt-1.5 text-xs text-zinc-700">
            Clears prior results · re-runs fresh · computes accuracy, F1, latency & confusion matrix
          </p>
        </div>
      )}

    </div>
  )
}
