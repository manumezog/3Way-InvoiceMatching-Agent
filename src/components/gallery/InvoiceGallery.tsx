'use client'

import { STATIC_SCENARIOS } from '@/data/scenarios-static'
import { InvoiceCard } from './InvoiceCard'

interface InvoiceGalleryProps {
  selectedId: string | null
  runningId: string | null
  doneIds: Set<string>
  onSelect: (id: string) => void
}

export function InvoiceGallery({ selectedId, runningId, doneIds, onSelect }: InvoiceGalleryProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Invoice Gallery
        </h2>
        <span className="text-xs text-zinc-600">{STATIC_SCENARIOS.length} invoices</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {STATIC_SCENARIOS.map((scenario) => (
          <InvoiceCard
            key={scenario.id}
            scenario={scenario}
            isSelected={selectedId === scenario.id}
            isRunning={runningId === scenario.id}
            isDone={doneIds.has(scenario.id)}
            onClick={() => onSelect(scenario.id)}
          />
        ))}
      </div>
    </div>
  )
}
