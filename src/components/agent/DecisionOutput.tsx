'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, ShieldAlert, AlertCircle, Gauge, Clock, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DecisionStatus = 'APPROVED' | 'FLAGGED' | 'ESCALATED'

export interface DecisionResult {
  invoiceId: string
  status: DecisionStatus
  flag_reason: string | null
  confidence: number
  explanation: string
  durationMs: number
  traceId: string | null
  traceUrl: string | null
}

interface DecisionOutputProps {
  result: DecisionResult | null
  isRunning: boolean
}

const STATUS_CONFIG = {
  APPROVED: {
    icon: ShieldCheck,
    label: 'Approved',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    iconColor: 'text-emerald-500',
  },
  FLAGGED: {
    icon: ShieldAlert,
    label: 'Flagged',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    iconColor: 'text-red-500',
  },
  ESCALATED: {
    icon: AlertCircle,
    label: 'Escalated',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    iconColor: 'text-amber-500',
  },
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = value >= 0.85 ? 'bg-emerald-500' : value >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">Confidence</span>
        <span className="text-[10px] font-semibold text-zinc-300">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export function DecisionOutput({ result, isRunning }: DecisionOutputProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <Gauge className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Decision
        </h3>
        <AnimatePresence>
          {result && (
            <motion.div
              key="meta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-auto flex items-center gap-2"
            >
              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                <Clock className="h-3 w-3" />
                {(result.durationMs / 1000).toFixed(1)}s
              </span>
              {result.traceUrl && (
                <a
                  href={result.traceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open trace in Langfuse"
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  Trace
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <AnimatePresence mode="wait">
          {!result && !isRunning && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-32 flex-col items-center justify-center gap-2 text-center"
            >
              <Gauge className="h-6 w-6 text-zinc-600" />
              <p className="text-xs text-zinc-500">Awaiting agent run…</p>
            </motion.div>
          )}

          {isRunning && !result && (
            <motion.div
              key="running"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-32 flex-col items-center justify-center gap-2 text-center"
            >
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
              <p className="text-xs text-zinc-500">Reasoning…</p>
            </motion.div>
          )}

          {result && (() => {
            const cfg = STATUS_CONFIG[result.status]
            const Icon = cfg.icon
            return (
              <motion.div
                key={`result-${result.invoiceId}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-4"
              >
                {/* Status badge */}
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className={cn('flex items-center gap-2 rounded-lg border p-3', cfg.bg, cfg.border)}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', cfg.iconColor)} />
                  <div>
                    <p className={cn('text-sm font-bold', cfg.text)}>{cfg.label}</p>
                    {result.flag_reason && (
                      <p className="text-[10px] text-zinc-500">
                        {result.flag_reason.replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Confidence */}
                <ConfidenceBar value={result.confidence} />

                {/* Explanation */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Agent Reasoning
                  </p>
                  <p className="text-xs leading-relaxed text-zinc-300">{result.explanation}</p>
                </motion.div>
              </motion.div>
            )
          })()}
        </AnimatePresence>
      </div>
    </div>
  )
}
