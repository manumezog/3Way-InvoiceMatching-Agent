'use client'

import { Terminal, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export type TraceStepStatus = 'pending' | 'running' | 'done' | 'error'

export interface TraceStep {
  id: string
  label: string
  detail?: string
  status: TraceStepStatus
}

interface TracePanelProps {
  steps: TraceStep[]
  isIdle: boolean
}

const STATUS_ICON = {
  pending: <Circle className="h-3.5 w-3.5 text-zinc-700" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  error: <Circle className="h-3.5 w-3.5 text-red-500" />,
}

const STATUS_TEXT_CLASS: Record<TraceStepStatus, string> = {
  pending: 'text-zinc-600',
  running: 'text-emerald-300',
  done: 'text-zinc-300',
  error: 'text-red-400',
}

export function TracePanel({ steps, isIdle }: TracePanelProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <Terminal className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Agent Trace
        </h3>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isIdle ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
              <Terminal className="h-6 w-6 text-zinc-700" />
              <p className="text-xs text-zinc-600">
                Select an invoice and click a card to run the agent
              </p>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {steps.map((step) => (
                <li key={step.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0">{STATUS_ICON[step.status]}</span>
                  <div className="min-w-0">
                    <p className={cn('text-xs font-mono font-medium', STATUS_TEXT_CLASS[step.status])}>
                      {step.label}
                    </p>
                    {step.detail && (
                      <p className="mt-0.5 truncate text-[10px] text-zinc-600">{step.detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
