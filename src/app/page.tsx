'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/dashboard/Navbar'
import { HowItWorksModal } from '@/components/dashboard/HowItWorksModal'
import { ActionBar, type BatchStats } from '@/components/dashboard/ActionBar'
import { InvoiceGallery } from '@/components/gallery/InvoiceGallery'
import { TracePanel, type TraceStep } from '@/components/agent/TracePanel'
import { DecisionOutput, type DecisionResult } from '@/components/agent/DecisionOutput'
import { EvalDashboard } from '@/components/eval/EvalDashboard'
import { UploadModal } from '@/components/byoi/UploadModal'
import { DatabaseExplorer } from '@/components/database/DatabaseExplorer'
import { EscalationsDashboard } from '@/components/escalations/EscalationsDashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { STATIC_SCENARIOS } from '@/data/scenarios-static'

type MatchStatus = 'APPROVED' | 'FLAGGED' | 'ESCALATED'

// ---------------------------------------------------------------------------
// SSE stream consumer — parses chunked SSE text/event-stream responses
// ---------------------------------------------------------------------------
async function streamInvoice(
  scenarioId: string,
  onStep: (step: TraceStep) => void,
  onResult: (result: DecisionResult) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/agent/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId }),
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })
    const chunks = buf.split('\n\n')
    buf = chunks.pop() ?? ''

    for (const chunk of chunks) {
      const line = chunk.trim()
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'step') {
          onStep({
            step:   data.step,
            label:  data.label,
            detail: data.detail,
            status: data.status,
            ts:     data.ts,
          })
        } else if (data.type === 'result') {
          onResult({
            invoiceId:   data.invoiceId,
            status:      data.status,
            flag_reason: data.flag_reason,
            confidence:  data.confidence,
            explanation: data.explanation,
            durationMs:  data.durationMs,
            traceId:  data.traceId,
            traceUrl: data.traceUrl ?? null,
          })
        }
        // 'done' type — stream closes naturally
      } catch {
        // skip malformed event
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Home() {
  const [selectedId, setSelectedId]         = useState<string | null>(null)
  const [runningId, setRunningId]           = useState<string | null>(null)
  const [results, setResults]               = useState<Record<string, MatchStatus>>({})
  const [activeTab, setActiveTab]           = useState('gallery')
  const [traceSteps, setTraceSteps]         = useState<TraceStep[]>([])
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null)
  const [isRunning, setIsRunning]           = useState(false)
  const [batchStats, setBatchStats]         = useState<BatchStats | undefined>(undefined)
  const [showUpload, setShowUpload]         = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  // Update a step in-place if it already exists (running → done), otherwise append
  const applyStep = useCallback((event: TraceStep) => {
    setTraceSteps(prev => {
      const idx = prev.findIndex(s => s.step === event.step)
      if (idx === -1) return [...prev, event]
      const next = [...prev]
      next[idx] = event
      return next
    })
  }, [])

  const runInvoice = useCallback(async (scenarioId: string) => {
    if (isRunning) return
    setSelectedId(scenarioId)
    setIsRunning(true)
    setRunningId(scenarioId)
    setTraceSteps([])
    setDecisionResult(null)

    try {
      let finalResult: DecisionResult | null = null

      await streamInvoice(
        scenarioId,
        applyStep,
        (r) => {
          finalResult = r
          setDecisionResult(r)
        },
      )

      if (finalResult) {
        setResults(prev => ({
          ...prev,
          [scenarioId]: (finalResult as DecisionResult).status,
        }))
      }
    } catch (err) {
      console.error('Agent run failed:', err)
    } finally {
      setIsRunning(false)
      setRunningId(null)
    }
  }, [isRunning, applyStep])

  const regenerate = useCallback(async () => {
    if (isRunning) return
    await fetch('/api/reset', { method: 'POST' })
    setResults({})
    setBatchStats(undefined)
    setSelectedId(null)
    setTraceSteps([])
    setDecisionResult(null)
    setActiveTab('gallery')
  }, [isRunning])

  const runBatch = useCallback(async () => {
    if (isRunning) return
    setIsRunning(true)
    setActiveTab('gallery')

    const stats: BatchStats = { total: STATIC_SCENARIOS.length, done: 0, approved: 0, flagged: 0, escalated: 0 }
    setBatchStats({ ...stats })

    for (const scenario of STATIC_SCENARIOS) {
      setSelectedId(scenario.id)
      setRunningId(scenario.id)
      setTraceSteps([])
      setDecisionResult(null)

      try {
        await streamInvoice(
          scenario.id,
          applyStep,
          (r) => {
            setDecisionResult(r)
            setResults(prev => ({ ...prev, [scenario.id]: r.status }))

            stats.done++
            if (r.status === 'APPROVED')       stats.approved++
            else if (r.status === 'FLAGGED')   stats.flagged++
            else if (r.status === 'ESCALATED') stats.escalated++
            setBatchStats({ ...stats })
          },
        )
      } catch (err) {
        console.error(`Batch: ${scenario.id} failed:`, err)
        stats.done++
        setBatchStats({ ...stats })
      } finally {
        setRunningId(null)
      }
    }

    setIsRunning(false)
  }, [isRunning, applyStep])

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <AnimatePresence>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
        {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
      </AnimatePresence>
      <Navbar onHowItWorks={() => setShowHowItWorks(true)} />
      <ActionBar
        onRunBatch={runBatch}
        onEvalMode={() => setActiveTab('eval')}
        onUpload={() => setShowUpload(true)}
        onRegenerate={regenerate}
        onGallery={() => setActiveTab('gallery')}
        onExploreDb={() => setActiveTab('db')}
        onEscalations={() => setActiveTab('escalations')}
        isRunning={isRunning}
        batchStats={batchStats}
      />

      <main className="mx-auto w-full max-w-screen-xl flex-1 px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="gallery" className="space-y-5">
            <InvoiceGallery
              selectedId={selectedId}
              runningId={runningId}
              results={results}
              onSelect={runInvoice}
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

          <TabsContent value="db">
            <DatabaseExplorer />
          </TabsContent>

          <TabsContent value="escalations">
            <EscalationsDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
