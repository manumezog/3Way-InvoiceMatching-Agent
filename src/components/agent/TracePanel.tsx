'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export type TraceStepStatus = 'running' | 'done' | 'error'

export interface TraceStep {
  step: string
  label: string
  detail?: string
  status: TraceStepStatus
  ts: number
}

interface TracePanelProps {
  steps: TraceStep[]
  isIdle: boolean
}

const STATUS_ICON: Record<TraceStepStatus, React.ReactNode> = {
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />,
  done:    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  error:   <XCircle className="h-3.5 w-3.5 text-red-500" />,
}

const STATUS_TEXT_CLASS: Record<TraceStepStatus, string> = {
  running: 'text-emerald-300',
  done:    'text-zinc-300',
  error:   'text-red-400',
}

export function TracePanel({ steps, isIdle }: TracePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps])

  const doneCount = steps.filter(s => s.status === 'done').length

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <Terminal className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Agent Trace
        </h3>
        <AnimatePresence>
          {!isIdle && steps.length > 0 && (
            <motion.span
              key="counter"
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-auto text-[10px] text-zinc-600"
            >
              {doneCount}/{steps.length} steps
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <AnimatePresence mode="wait">
            {isIdle ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-32 flex-col items-center justify-center gap-2 text-center"
              >
                <Terminal className="h-6 w-6 text-zinc-700" />
                <p className="text-xs text-zinc-600">
                  Click any invoice card to run the agent
                </p>
              </motion.div>
            ) : (
              <motion.ol
                key="steps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2.5"
              >
                <AnimatePresence initial={false}>
                  {steps.map((step) => (
                    <motion.li
                      key={step.step}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-2.5"
                    >
                      <span className="mt-0.5 shrink-0">{STATUS_ICON[step.status]}</span>
                      <div className="min-w-0">
                        <p className={cn('text-xs font-mono font-medium', STATUS_TEXT_CLASS[step.status])}>
                          {step.label}
                        </p>
                        <AnimatePresence>
                          {step.detail && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-0.5 truncate text-[10px] text-zinc-600"
                            >
                              {step.detail}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
                <div ref={bottomRef} />
              </motion.ol>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  )
}
