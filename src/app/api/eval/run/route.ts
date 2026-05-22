import { runMigrations } from '@/lib/db/migrate'
import { getAllInvoices, clearMatchResults } from '@/lib/db/repo'
import { runAgent } from '@/lib/agent/orchestrator'
import { STATIC_SCENARIOS } from '@/data/scenarios-static'

export const dynamic = 'force-dynamic'

type MatchStatus = 'APPROVED' | 'FLAGGED' | 'ESCALATED'

export interface EvalRun {
  scenarioId: string
  title: string
  expected: MatchStatus
  actual: MatchStatus
  correct: boolean
  confidence: number
  durationMs: number
}

export interface EvalMetrics {
  total: number
  correct: number
  accuracy: number
  avgConfidence: number
  p50LatencyMs: number
  p95LatencyMs: number
  perClass: Record<MatchStatus, { precision: number; recall: number; f1: number; support: number }>
  macroF1: number
  confusionMatrix: Record<MatchStatus, Record<MatchStatus, number>>
  runs: EvalRun[]
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function computeMetrics(runs: EvalRun[]): EvalMetrics {
  const classes: MatchStatus[] = ['APPROVED', 'FLAGGED', 'ESCALATED']
  const total = runs.length
  const correct = runs.filter(r => r.correct).length
  const accuracy = total > 0 ? correct / total : 0
  const avgConfidence = total > 0 ? runs.reduce((s, r) => s + r.confidence, 0) / total : 0

  const sortedMs = [...runs.map(r => r.durationMs)].sort((a, b) => a - b)
  const p50LatencyMs = percentile(sortedMs, 50)
  const p95LatencyMs = percentile(sortedMs, 95)

  // Confusion matrix: confusionMatrix[actual][predicted]
  const confusionMatrix = Object.fromEntries(
    classes.map(a => [a, Object.fromEntries(classes.map(p => [p, 0]))])
  ) as Record<MatchStatus, Record<MatchStatus, number>>

  for (const run of runs) {
    confusionMatrix[run.expected][run.actual]++
  }

  // Per-class precision, recall, F1
  const perClass = Object.fromEntries(classes.map(cls => {
    const tp = runs.filter(r => r.expected === cls && r.actual === cls).length
    const fp = runs.filter(r => r.expected !== cls && r.actual === cls).length
    const fn = runs.filter(r => r.expected === cls && r.actual !== cls).length
    const support = runs.filter(r => r.expected === cls).length
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0
    const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0
    return [cls, { precision, recall, f1, support }]
  })) as Record<MatchStatus, { precision: number; recall: number; f1: number; support: number }>

  const macroF1 = classes.reduce((s, c) => s + perClass[c].f1, 0) / classes.length

  return { total, correct, accuracy, avgConfidence, p50LatencyMs, p95LatencyMs, perClass, macroF1, confusionMatrix, runs }
}

export async function POST(): Promise<Response> {
  runMigrations()

  // Reset DB so eval runs from a clean slate
  await clearMatchResults()

  const invoices = await getAllInvoices()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        } catch { /* client disconnected */ }
      }

      const evalRuns: EvalRun[] = []

      for (const scenario of STATIC_SCENARIOS) {
        const invoice = invoices.find(i => i.scenario_id === scenario.id)
        if (!invoice) {
          send({ type: 'skip', scenarioId: scenario.id, reason: 'invoice not found in DB' })
          continue
        }

        send({ type: 'progress', scenarioId: scenario.id, title: scenario.title, done: evalRuns.length, total: STATIC_SCENARIOS.length })

        try {
          const result = await runAgent(invoice.id)
          const actual = result.status as MatchStatus
          const run: EvalRun = {
            scenarioId: scenario.id,
            title: scenario.title,
            expected: scenario.ground_truth,
            actual,
            correct: actual === scenario.ground_truth,
            confidence: result.confidence,
            durationMs: result.durationMs,
          }
          evalRuns.push(run)
          send({ type: 'result', ...run })
        } catch (err) {
          send({ type: 'error', scenarioId: scenario.id, message: String(err) })
        }
      }

      const metrics = computeMetrics(evalRuns)
      send({ type: 'complete', metrics })
      send({ type: 'done' })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
