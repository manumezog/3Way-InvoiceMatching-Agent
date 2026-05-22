'use client'

import { FileText, Camera, ScanLine, PenLine, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StaticScenario, PdfVariant } from '@/data/scenarios-static'

type MatchStatus = 'APPROVED' | 'FLAGGED' | 'ESCALATED'

interface InvoiceCardProps {
  scenario: StaticScenario
  isSelected: boolean
  isRunning: boolean
  result?: MatchStatus       // actual agent result (undefined = not yet run)
  onClick: () => void
}

const VARIANT_ICON: Record<PdfVariant, React.ElementType> = {
  clean: FileText,
  scanned: ScanLine,
  photo: Camera,
  handwritten: PenLine,
  crumpled: Layers,
}

const VARIANT_LABEL: Record<PdfVariant, string> = {
  clean: 'Digital PDF',
  scanned: 'Scanned',
  photo: 'Phone Photo',
  handwritten: 'Handwritten',
  crumpled: 'Crumpled',
}

const DIFFICULTY_STYLES = {
  easy:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  hard:   'bg-red-500/10 text-red-400 border-red-500/20',
}

const RESULT_DOT: Record<MatchStatus, string> = {
  APPROVED:  'bg-emerald-500',
  FLAGGED:   'bg-red-500',
  ESCALATED: 'bg-amber-500',
}

export function InvoiceCard({ scenario, isSelected, isRunning, result, onClick }: InvoiceCardProps) {
  const Icon = VARIANT_ICON[scenario.pdf_variant]
  const isDone = result !== undefined

  return (
    <button
      onClick={onClick}
      disabled={isRunning}
      className={cn(
        'group relative flex w-full flex-col rounded-xl border p-0 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
        isSelected
          ? 'border-emerald-500/50 bg-zinc-800/80 shadow-lg shadow-emerald-500/5'
          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60',
        isRunning && 'cursor-not-allowed',
      )}
    >
      {/* Thumbnail area */}
      <div className={cn(
        'relative flex h-28 w-full items-center justify-center rounded-t-xl',
        'border-b border-zinc-800 bg-zinc-950/60',
        isRunning && 'animate-pulse',
      )}>
        <Icon className={cn(
          'h-10 w-10 transition-colors',
          isSelected ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-500',
        )} />

        {/* Running spinner overlay */}
        {isRunning && (
          <div className="absolute inset-0 flex items-center justify-center rounded-t-xl bg-zinc-950/60">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
          </div>
        )}

        {/* Variant label */}
        <span className="absolute bottom-2 left-2 text-[10px] font-medium text-zinc-600">
          {VARIANT_LABEL[scenario.pdf_variant]}
        </span>

        {/* Result dot — shows actual agent outcome, not ground truth */}
        {isDone && (
          <div className={cn(
            'absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-900',
            RESULT_DOT[result],
          )} />
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2 p-3">
        <p className="text-xs font-medium leading-tight text-zinc-200">
          {scenario.title}
        </p>
        <p className="text-[10px] text-zinc-500">{scenario.vendor}</p>
        <div className="flex flex-wrap gap-1">
          <Badge
            variant="outline"
            className={cn('px-1.5 py-0 text-[10px] capitalize', DIFFICULTY_STYLES[scenario.difficulty])}
          >
            {scenario.difficulty}
          </Badge>
          <Badge
            variant="outline"
            className="border-zinc-700 bg-transparent px-1.5 py-0 text-[10px] text-zinc-400"
          >
            {scenario.skill_tag}
          </Badge>
        </div>
      </div>
    </button>
  )
}
