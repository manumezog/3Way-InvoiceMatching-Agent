'use client'

import { BarChart3, FlaskConical } from 'lucide-react'
import { STATIC_SCENARIOS } from '@/data/scenarios-static'

export function EvalDashboard() {
  const total = STATIC_SCENARIOS.length
  const approved = STATIC_SCENARIOS.filter(s => s.ground_truth === 'APPROVED').length
  const flagged = STATIC_SCENARIOS.filter(s => s.ground_truth === 'FLAGGED').length
  const escalated = STATIC_SCENARIOS.filter(s => s.ground_truth === 'ESCALATED').length

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-6 flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-zinc-500" />
        <h2 className="text-sm font-semibold text-zinc-300">Eval Mode</h2>
        <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
          Coming in Phase 6
        </span>
      </div>

      {/* Ground truth summary */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{approved}</p>
          <p className="mt-1 text-xs text-zinc-500">Expected Approved</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{flagged}</p>
          <p className="mt-1 text-xs text-zinc-500">Expected Flagged</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{escalated}</p>
          <p className="mt-1 text-xs text-zinc-500">Expected Escalated</p>
        </div>
      </div>

      {/* Placeholder metrics */}
      <div className="space-y-3">
        {[
          { label: 'Accuracy', value: '—' },
          { label: 'Precision', value: '—' },
          { label: 'Recall', value: '—' },
          { label: 'Avg Confidence', value: '—' },
          { label: 'p50 Latency', value: '—' },
          { label: 'p95 Latency', value: '—' },
          { label: 'Cost / Invoice', value: '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">{label}</span>
            <span className="font-mono text-sm text-zinc-700">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
        <BarChart3 className="h-4 w-4 shrink-0 text-zinc-600" />
        <p className="text-xs text-zinc-600">
          Run the full batch first. Eval metrics populate after all {total} invoices are processed against ground-truth labels.
        </p>
      </div>
    </div>
  )
}
