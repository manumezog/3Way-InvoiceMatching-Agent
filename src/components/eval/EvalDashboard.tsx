'use client'

import { useState, useCallback } from 'react'
import { FlaskConical, Play, CheckCircle2, XCircle, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STATIC_SCENARIOS } from '@/data/scenarios-static'
import { cn } from '@/lib/utils'
import type { EvalMetrics, EvalRun } from '@/app/api/eval/run/route'

type MatchStatus = 'APPROVED' | 'FLAGGED' | 'ESCALATED'

// ---------------------------------------------------------------------------
// SSE consumer for eval stream
// ---------------------------------------------------------------------------
interface ProgressState {
  done: number
  total: number
  currentTitle: string
}

async function streamEval(
  onProgress: (p: ProgressState) => void,
  onResult: (r: EvalRun) => void,
  onComplete: (m: EvalMetrics) => void,
): Promise<void> {
  const res = await fetch('/api/eval/run', { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (!res.body) throw new Error('No response body')

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
        if (data.type === 'progress') onProgress({ done: data.done, total: data.total, currentTitle: data.title })
        else if (data.type === 'result') onResult(data as EvalRun)
        else if (data.type === 'complete') onComplete(data.metrics as EvalMetrics)
      } catch { /* skip malformed */ }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_COLOR: Record<MatchStatus, string> = {
  APPROVED:  'text-emerald-400',
  FLAGGED:   'text-red-400',
  ESCALATED: 'text-amber-400',
}

const STATUS_BG: Record<MatchStatus, string> = {
  APPROVED:  'bg-emerald-500/10',
  FLAGGED:   'bg-red-500/10',
  ESCALATED: 'bg-amber-500/10',
}

function pct(n: number) { return `${Math.round(n * 100)}%` }
function ms(n: number)  { return n < 1000 ? `${Math.round(n)}ms` : `${(n / 1000).toFixed(1)}s` }

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-zinc-600">{sub}</p>}
    </div>
  )
}

function ConfusionMatrix({ matrix }: { matrix: EvalMetrics['confusionMatrix'] }) {
  const classes: MatchStatus[] = ['APPROVED', 'FLAGGED', 'ESCALATED']
  const short: Record<MatchStatus, string> = { APPROVED: 'APR', FLAGGED: 'FLG', ESCALATED: 'ESC' }
  const max = Math.max(...classes.flatMap(a => classes.map(p => matrix[a][p])))

  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        Confusion Matrix <span className="normal-case text-zinc-700">(rows = actual, cols = predicted)</span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left text-[10px] text-zinc-600">actual \ pred</th>
              {classes.map(c => (
                <th key={c} className={cn('p-2 text-[10px] font-semibold', STATUS_COLOR[c])}>{short[c]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.map(actual => (
              <tr key={actual}>
                <td className={cn('p-2 text-left text-[10px] font-semibold', STATUS_COLOR[actual])}>{short[actual]}</td>
                {classes.map(pred => {
                  const count = matrix[actual][pred]
                  const isDiag = actual === pred
                  const intensity = max > 0 ? count / max : 0
                  return (
                    <td
                      key={pred}
                      className={cn(
                        'p-2 font-mono text-sm font-bold',
                        isDiag
                          ? count > 0 ? 'text-emerald-400' : 'text-zinc-700'
                          : count > 0 ? 'text-red-400' : 'text-zinc-800',
                      )}
                      style={{ opacity: count > 0 ? 0.4 + intensity * 0.6 : 1 }}
                    >
                      {count}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PerClassTable({ perClass }: { perClass: EvalMetrics['perClass'] }) {
  const classes: MatchStatus[] = ['APPROVED', 'FLAGGED', 'ESCALATED']
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Per-Class Metrics</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="pb-2 text-left text-[10px] text-zinc-600">Class</th>
            <th className="pb-2 text-right text-[10px] text-zinc-600">Support</th>
            <th className="pb-2 text-right text-[10px] text-zinc-600">Precision</th>
            <th className="pb-2 text-right text-[10px] text-zinc-600">Recall</th>
            <th className="pb-2 text-right text-[10px] text-zinc-600">F1</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {classes.map(cls => {
            const m = perClass[cls]
            return (
              <tr key={cls}>
                <td className={cn('py-2 font-semibold', STATUS_COLOR[cls])}>{cls}</td>
                <td className="py-2 text-right font-mono text-zinc-500">{m.support}</td>
                <td className="py-2 text-right font-mono text-zinc-300">{pct(m.precision)}</td>
                <td className="py-2 text-right font-mono text-zinc-300">{pct(m.recall)}</td>
                <td className="py-2 text-right font-mono text-zinc-100 font-bold">{pct(m.f1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RunsTable({ runs }: { runs: EvalRun[] }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Per-Scenario Results</p>
      <div className="space-y-1">
        {STATIC_SCENARIOS.map(scenario => {
          const run = runs.find(r => r.scenarioId === scenario.id)
          return (
            <div key={scenario.id} className="flex items-center gap-2 rounded-lg bg-zinc-950/40 px-3 py-2">
              {/* Pass/fail icon */}
              <span className="shrink-0">
                {!run ? (
                  <Minus className="h-3.5 w-3.5 text-zinc-700" />
                ) : run.correct ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                )}
              </span>

              {/* Title */}
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{scenario.title}</span>

              {/* Expected */}
              <span className={cn('text-[10px]', run ? STATUS_COLOR[scenario.ground_truth] : 'text-zinc-600')}>
                {scenario.ground_truth}
              </span>

              {run && run.actual !== run.expected && (
                <>
                  <span className="text-[10px] text-zinc-700">→</span>
                  <span className={cn('text-[10px] font-semibold', STATUS_COLOR[run.actual])}>{run.actual}</span>
                </>
              )}

              {/* Confidence + latency */}
              {run && (
                <span className="ml-1 shrink-0 font-mono text-[10px] text-zinc-600">
                  {pct(run.confidence)} · {ms(run.durationMs)}
                </span>
              )}
            </div>
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
  const [isRunning, setIsRunning]   = useState(false)
  const [progress, setProgress]     = useState<ProgressState | null>(null)
  const [partialRuns, setPartialRuns] = useState<EvalRun[]>([])
  const [metrics, setMetrics]       = useState<EvalMetrics | null>(null)

  const runEval = useCallback(async () => {
    if (isRunning) return
    setIsRunning(true)
    setProgress({ done: 0, total: STATIC_SCENARIOS.length, currentTitle: '' })
    setPartialRuns([])
    setMetrics(null)

    try {
      await streamEval(
        (p) => setProgress(p),
        (r) => {
          setPartialRuns(prev => [...prev, r])
          setProgress(prev => prev ? { ...prev, done: prev.done + 1, currentTitle: '' } : prev)
        },
        (m) => setMetrics(m),
      )
    } catch (err) {
      console.error('Eval failed:', err)
    } finally {
      setIsRunning(false)
    }
  }, [isRunning])

  const runsToShow = metrics?.runs ?? partialRuns

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-300">Eval Mode</h2>
          {metrics && (
            <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
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

      {/* Progress bar */}
      {isRunning && progress && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-zinc-400">
              {progress.done < progress.total
                ? `Running scenario ${progress.done + 1}/${progress.total}…`
                : 'Computing metrics…'}
            </span>
            <span className="font-mono text-zinc-600">{progress.done}/{progress.total}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          {runsToShow.length > 0 && (
            <div className="mt-3">
              <RunsTable runs={runsToShow} />
            </div>
          )}
        </div>
      )}

      {/* Metrics — shown after eval completes */}
      {metrics && !isRunning && (
        <>
          {/* Top metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard label="Accuracy" value={pct(metrics.accuracy)} />
            <MetricCard label="Macro F1" value={pct(metrics.macroF1)} />
            <MetricCard label="Avg Confidence" value={pct(metrics.avgConfidence)} />
            <MetricCard label="p50 Latency" value={ms(metrics.p50LatencyMs)} />
            <MetricCard label="p95 Latency" value={ms(metrics.p95LatencyMs)} />
            <MetricCard
              label="Pass Rate"
              value={`${metrics.correct}/${metrics.total}`}
              sub={`${metrics.total - metrics.correct} incorrect`}
            />
          </div>

          {/* Confusion + per-class */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <ConfusionMatrix matrix={metrics.confusionMatrix} />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <PerClassTable perClass={metrics.perClass} />
            </div>
          </div>

          {/* Per-scenario table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <RunsTable runs={metrics.runs} />
          </div>
        </>
      )}

      {/* Idle state */}
      {!isRunning && !metrics && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <FlaskConical className="mx-auto mb-3 h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            Click <span className="text-zinc-300">Run Eval</span> to benchmark the agent against all {STATIC_SCENARIOS.length} ground-truth scenarios.
          </p>
          <p className="mt-1 text-xs text-zinc-700">
            The eval clears prior results and re-runs each scenario fresh, then computes accuracy, F1, latency, and confusion matrix.
          </p>
        </div>
      )}
    </div>
  )
}
