import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAllInvoices } from '@/lib/db/repo'
import { runAgent } from '@/lib/agent/orchestrator'

const RequestSchema = z.object({
  scenarioId: z.string(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 })
  }

  const { scenarioId } = parsed.data

  // Find invoice by scenario_id
  const invoices = await getAllInvoices()
  const invoice = invoices.find(inv => inv.scenario_id === scenarioId)
  if (!invoice) {
    return NextResponse.json({ error: `No invoice found for scenario ${scenarioId}` }, { status: 404 })
  }

  try {
    const result = await runAgent(invoice.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[agent/run]', err)
    return NextResponse.json({ error: 'Agent run failed', detail: String(err) }, { status: 500 })
  }
}
