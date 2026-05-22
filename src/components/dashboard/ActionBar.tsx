'use client'

import { Play, BarChart3, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ActionBarProps {
  onRunBatch: () => void
  onEvalMode: () => void
  onUpload: () => void
  isRunning: boolean
}

export function ActionBar({ onRunBatch, onEvalMode, onUpload, isRunning }: ActionBarProps) {
  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-3">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">
            Select an invoice below to process it, or run the full batch at once.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            variant="outline"
            size="sm"
            onClick={onEvalMode}
            className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Eval Mode
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
