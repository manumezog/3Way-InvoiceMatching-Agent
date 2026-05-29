'use client'

import { Download } from 'lucide-react'
import { STATIC_SCENARIOS } from '@/data/scenarios-static'
import { InvoiceCard } from './InvoiceCard'

type MatchStatus = 'APPROVED' | 'FLAGGED' | 'ESCALATED'

interface InvoiceGalleryProps {
  selectedId: string | null
  runningId: string | null
  results: Record<string, MatchStatus>   // scenarioId → actual agent result
  onSelect: (id: string) => void
}

export function InvoiceGallery({ selectedId, runningId, results, onSelect }: InvoiceGalleryProps) {
  const doneCount = Object.keys(results).length

  function downloadAll() {
    STATIC_SCENARIOS.forEach((s, i) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = `/invoices/${s.id}.pdf`
        a.download = `${s.title.toLowerCase().replace(/\s+/g, '-')}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }, i * 400)
    })
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Invoice Gallery
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">
            {doneCount > 0 ? `${doneCount}/${STATIC_SCENARIOS.length} processed` : `${STATIC_SCENARIOS.length} invoices`}
          </span>
          <button
            onClick={downloadAll}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Download className="h-3 w-3" />
            Download All
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {STATIC_SCENARIOS.map((scenario) => (
          <InvoiceCard
            key={scenario.id}
            scenario={scenario}
            isSelected={selectedId === scenario.id}
            isRunning={runningId === scenario.id}
            result={results[scenario.id]}
            onClick={() => onSelect(scenario.id)}
          />
        ))}
      </div>
    </div>
  )
}
