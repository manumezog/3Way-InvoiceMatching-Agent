import { runMigrationsAsync } from '@/lib/db/migrate'
import { getAllInvoices, clearMatchResultsForInvoice, countRunsToday } from '@/lib/db/repo'
import { runAgent, type TraceEvent } from '@/lib/agent/orchestrator'
import { getLangfuse } from '@/lib/agent/langfuse'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<Response> {
  let body: unknown
  try { body = await req.json() } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const scenarioId = (body as Record<string, unknown>)?.scenarioId
  if (typeof scenarioId !== 'string' || !/^scenario-\d{2}$/.test(scenarioId)) {
    return Response.json({ error: 'Invalid scenarioId' }, { status: 400 })
  }

  await runMigrationsAsync()

  const runsToday = await countRunsToday()
  if (runsToday >= env.MAX_DAILY_RUNS) {
    return Response.json(
      { error: `Daily demo limit reached (${env.MAX_DAILY_RUNS} runs/day). Try again tomorrow.` },
      { status: 503 },
    )
  }

  const invoices = await getAllInvoices()
  const invoice = invoices.find(i => i.scenario_id === scenarioId)
  if (!invoice) {
    return Response.json({ error: `No invoice for scenario ${scenarioId}` }, { status: 404 })
  }

  // Reset any prior match result so re-runs don't get flagged as duplicates
  await clearMatchResultsForInvoice(invoice.id)

  // ---------------------------------------------------------------------------
  // Langfuse trace — created once per agent run; null if keys not configured
  // ---------------------------------------------------------------------------
  const langfuse = getLangfuse()
  const lfTrace = langfuse?.trace({
    name: 'invoice-match',
    input: {
      scenarioId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      vendor: invoice.vendor_name,
    },
  }) ?? null

  // ---------------------------------------------------------------------------
  // SSE stream — each TraceEvent is flushed as it fires, no buffering
  // ---------------------------------------------------------------------------
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        } catch {
          // controller already closed (client disconnected)
        }
      }

      // Track open Langfuse spans by step ID so we can close them on done/error
      const openSpans = new Map<string, ReturnType<NonNullable<typeof lfTrace>['span']>>()

      const emit = (event: TraceEvent) => {
        send({ type: 'step', ...event })

        if (lfTrace) {
          if (event.status === 'running') {
            const span = lfTrace.span({ name: event.step, input: { label: event.label, detail: event.detail } })
            openSpans.set(event.step, span)
          } else {
            const span = openSpans.get(event.step)
            if (span) {
              span.end({
                output: { detail: event.detail },
                level: event.status === 'error' ? 'ERROR' : 'DEFAULT',
              })
              openSpans.delete(event.step)
            }
          }
        }
      }

      try {
        const result = await runAgent(invoice.id, emit, lfTrace?.id ?? null)

        if (lfTrace) {
          lfTrace.update({
            output: {
              status: result.status,
              flag_reason: result.flag_reason,
              confidence: result.confidence,
            },
          })
          await langfuse?.flushAsync()
        }

        // Build full trace URL using the client's own baseUrl + projectId (populated after flush).
        // The short /trace/{id} format only works on US; EU requires /project/{id}/traces/{id}.
        let traceUrl: string | null = null
        if (result.traceId && langfuse) {
          const base      = (langfuse.baseUrl as string).replace(/\/$/, '')
          const projectId = (langfuse as unknown as { projectId?: string }).projectId
          traceUrl = projectId
            ? `${base}/project/${projectId}/traces/${result.traceId}`
            : `${base}/trace/${result.traceId}`
        }
        send({ type: 'result', ...result, traceUrl })
      } catch (err) {
        send({ type: 'error', message: String(err) })
        if (lfTrace) {
          lfTrace.update({ output: { error: String(err) }, level: 'ERROR' } as Parameters<typeof lfTrace.update>[0])
          await langfuse?.flushAsync()
        }
      } finally {
        // Send a terminal sentinel so the client knows the stream is done
        send({ type: 'done' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering if proxied
    },
  })
}
