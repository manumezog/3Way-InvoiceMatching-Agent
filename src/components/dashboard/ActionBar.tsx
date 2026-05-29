'use client'

import { Play, BarChart3, Upload, CheckCircle2, ShieldAlert, AlertCircle, RefreshCw, Database, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface BatchStats {
  total: number
  done: number
  approved: number
  flagged: number
  escalated: number
}

interface ActionBarProps {
  onRunBatch: () => void
  onEvalMode: () => void
  onUpload: () => void
  onRegenerate: () => void
  onExploreDb: () => void
  onEscalations: () => void
  isRunning: boolean
  batchStats?: BatchStats
}

export function ActionBar({ onRunBatch, onEvalMode, onUpload, onRegenerate, onExploreDb, onEscalations, isRunning, batchStats }: ActionBarProps) {
  const hasBatchResults = batchStats && batchStats.done > 0

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-3">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-4">
        {/* Left: status text or batch stats */}
        <div className="flex items-center gap-4">
          {hasBatchResults ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                Batch: {batchStats.done}/{batchStats.total}
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {batchStats.approved}
              </span>
              <span className="flex items-center gap-1 text-xs text-red-400">
                <ShieldAlert className="h-3.5 w-3.5" />
                {batchStats.flagged}
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {batchStats.escalated}
              </span>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              Click any invoice to process it, or run the full batch at once.
            </p>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExploreDb}
            className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <Database className="mr-1.5 h-3.5 w-3.5" />
            Explore Database
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEscalations}
            className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Escalations
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEvalMode}
            className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Eval Mode
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRunning}
            className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40"
            title="Reset all match results"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Reset Results
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onUpload}
            className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload Invoice
          </Button>
          <Button
            size="sm"
            onClick={onRunBatch}
            disabled={isRunning}
            className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {isRunning ? 'Processing…' : 'Process Today\'s Batch'}
          </Button>
        </div>
      </div>
    </div>
  )
}
