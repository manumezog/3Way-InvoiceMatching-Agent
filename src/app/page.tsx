'use client'

import { useState } from 'react'
import { Navbar } from '@/components/dashboard/Navbar'
import { ActionBar } from '@/components/dashboard/ActionBar'
import { InvoiceGallery } from '@/components/gallery/InvoiceGallery'
import { TracePanel } from '@/components/agent/TracePanel'
import { DecisionOutput } from '@/components/agent/DecisionOutput'
import { EvalDashboard } from '@/components/eval/EvalDashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import type { TraceStep } from '@/components/agent/TracePanel'
import type { DecisionResult } from '@/components/agent/DecisionOutput'

const PLACEHOLDER_STEPS: TraceStep[] = [
  { id: '1', label: 'extract_pdf()', detail: 'Parsing invoice structure…', status: 'done' },
  { id: '2', label: 'lookup_po("PO-4872")', detail: 'Fetching from purchase orders…', status: 'done' },
  { id: '3', label: 'query_wms("PO-4872")', detail: 'Retrieving warehouse receipt…', status: 'done' },
  { id: '4', label: 'fuzzy_match_vendor()', detail: 'Cosine similarity: 0.97', status: 'done' },
  { id: '5', label: 'reason_and_decide()', detail: 'Evaluating 3-way match…', status: 'running' },
]

const PLACEHOLDER_RESULT: DecisionResult = {
  status: 'FLAGGED',
  flag_reason: 'SHORTAGE',
  confidence: 0.94,
  explanation:
    'The vendor invoiced 50 units but the WMS receipt recorded only 48 units received at the dock. The 2-unit shortage (4%) exceeds the accepted tolerance. Invoice total is overbilled by $240.',
  invoice_number: 'INV-2024-0392',
  po_number: 'PO-4872',
}

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('gallery')
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([])
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  function runDemo(id: string) {
    if (isRunning) return
    setSelectedId(id)
    setIsRunning(true)
    setRunningId(id)
    setTraceSteps([])
    setDecisionResult(null)

    // Reveal trace steps one by one — real agent wired in Phase 4
    PLACEHOLDER_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setTraceSteps(prev => [
          ...prev,
          { ...step, status: i < PLACEHOLDER_STEPS.length - 1 ? 'done' : 'running' },
        ])
      }, i * 700)
    })

    // Reveal decision after all steps
    setTimeout(() => {
      setTraceSteps(PLACEHOLDER_STEPS.map(s => ({ ...s, status: 'done' })))
      setDecisionResult(PLACEHOLDER_RESULT)
      setIsRunning(false)
      setRunningId(null)
      setDoneIds(prev => new Set([...prev, id]))
    }, PLACEHOLDER_STEPS.length * 700 + 600)
  }

  function runBatch() {
    // Full batch wired in Phase 5
    alert('Batch processing coming in Phase 5!')
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />
      <ActionBar
        onRunBatch={runBatch}
        onEvalMode={() => setActiveTab('eval')}
        onUpload={() => alert('Upload coming in Phase 7!')}
        isRunning={isRunning}
      />

      <main className="mx-auto w-full max-w-screen-xl flex-1 px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-5 border border-zinc-800 bg-zinc-900">
            <TabsTrigger
              value="gallery"
              className="text-zinc-500 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
            >
              Gallery
            </TabsTrigger>
            <TabsTrigger
              value="eval"
              className="text-zinc-500 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
            >
              Eval Mode
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="space-y-5">
            <InvoiceGallery
              selectedId={selectedId}
              runningId={runningId}
              doneIds={doneIds}
              onSelect={runDemo}
            />

            <Separator className="bg-zinc-800" />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="h-72">
                <TracePanel steps={traceSteps} isIdle={traceSteps.length === 0 && !isRunning} />
              </div>
              <div className="h-72">
                <DecisionOutput result={decisionResult} isRunning={isRunning} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="eval">
            <EvalDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
