import { randomUUID } from 'crypto'
import { runMigrationsAsync } from '@/lib/db/migrate'
import { getInvoiceById, insertMatchResult, updateInvoiceStatus } from '@/lib/db/repo'
import {
  extractPdf, lookupPo, lookupPoByVendor, queryWms,
  fuzzyMatchVendor, convertCurrency, checkDuplicate, reasonAndDecide,
} from './tools/index'

// ---------------------------------------------------------------------------
// Trace event — streamed to the UI via SSE
// ---------------------------------------------------------------------------
export type TraceEventStatus = 'running' | 'done' | 'error'

export interface TraceEvent {
  step: string
  label: string
  detail?: string
  status: TraceEventStatus
  ts: number
}

export interface AgentResult {
  invoiceId: string
  status: string
  flag_reason: string | null
  confidence: number
  explanation: string
  trace: TraceEvent[]
  durationMs: number
  traceId: string | null
}

type EmitFn = (event: TraceEvent) => void

// ---------------------------------------------------------------------------
// Main agent run
// ---------------------------------------------------------------------------
export async function runAgent(invoiceId: string, emit: EmitFn = () => {}, traceId: string | null = null): Promise<AgentResult> {
  const start = Date.now()
  const trace: TraceEvent[] = []
  await runMigrationsAsync()

  function step(id: string, label: string, detail?: string): void {
    const event: TraceEvent = { step: id, label, detail, status: 'running', ts: Date.now() }
    trace.push(event)
    emit(event)
  }

  function done(id: string, detail?: string): void {
    const event = trace.find(e => e.step === id)
    if (event) { event.status = 'done'; event.detail = detail ?? event.detail }
    emit({ step: id, label: trace.find(e => e.step === id)?.label ?? id, detail, status: 'done', ts: Date.now() })
  }

  function fail(id: string, detail: string): void {
    const event = trace.find(e => e.step === id)
    if (event) { event.status = 'error'; event.detail = detail }
    emit({ step: id, label: trace.find(e => e.step === id)?.label ?? id, detail, status: 'error', ts: Date.now() })
  }

  // --- Step 1: Load invoice record ---
  step('load', 'load_invoice()', `id: ${invoiceId}`)
  const invoice = await getInvoiceById(invoiceId)
  if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`)
  done('load', `${invoice.invoice_number} — ${invoice.pdf_path}`)

  // --- Step 2: Duplicate check (fast, no API) ---
  step('dup', 'check_duplicate()', invoice.invoice_number)
  const dupCheck = await checkDuplicate(invoice.invoice_number)
  if (dupCheck.isDuplicate) {
    done('dup', `DUPLICATE — previously processed as ${dupCheck.previousStatus}`)
    const result = await saveResult(invoiceId, 'FLAGGED', 'DUPLICATE', 0.99, dupCheck.detail, undefined, undefined, traceId)
    return buildResult(invoiceId, result, trace, Date.now() - start)
  }
  done('dup', 'No prior record — proceeding')

  // --- Step 3: Extract PDF ---
  // BYOI invoices: skip re-extraction (the PDF carries the original PO reference, not the
  // synthetic BYOI PO). Use stored invoice data and point directly to the BYOI PO so the
  // injected discrepancy is what the agent actually evaluates.
  step('extract', 'extract_pdf()', invoice.pdf_path)
  let extracted
  if (invoice.scenario_id?.startsWith('byoi-')) {
    const byoiUuid   = invoice.scenario_id.slice(5)
    const byoiPoRef  = `BYOI-${byoiUuid.slice(0, 6).toUpperCase()}`
    const subtotal   = invoice.line_items.reduce((s, li) => s + li.qty * li.unit_price, 0)
    extracted = {
      invoice_number: invoice.invoice_number,
      vendor_name:    invoice.vendor_name,
      currency:       invoice.currency,
      po_reference:   byoiPoRef,
      line_items:     invoice.line_items,
      subtotal,
      tax_amount:     0,
      total:          subtotal,
      invoice_date:   null,
      notes:          null,
    }
    done('extract', `${extracted.line_items.length} line item(s) · ${extracted.currency} (BYOI — using stored data)`)
  } else {
    try {
      extracted = await extractPdf(invoice.pdf_path)
      done('extract', `${extracted.line_items.length} line item(s) · ${extracted.currency}`)
    } catch (err) {
      fail('extract', String(err))
      throw err
    }
  }

  // --- Step 4: Lookup PO ---
  step('po', `lookup_po("${extracted.po_reference ?? 'by vendor'}")`)
  let po = extracted.po_reference ? await lookupPo(extracted.po_reference) : null
  if (!po) {
    const candidates = await lookupPoByVendor(extracted.vendor_name)
    po = candidates[0] ?? null
  }
  if (!po) {
    fail('po', 'No matching PO found')
    const explanation = `No purchase order found matching invoice ${extracted.invoice_number} from vendor "${extracted.vendor_name}". Cannot complete 3-way match without a PO reference.`
    const result = await saveResult(invoiceId, 'ESCALATED', 'LOW_CONFIDENCE', 0.5, explanation, undefined, undefined, traceId)
    return buildResult(invoiceId, result, trace, Date.now() - start)
  }
  done('po', `${po.po_number} — ${po.vendor_name}`)

  // --- Step 5: Query WMS ---
  step('wms', `query_wms("${po.po_number}")`)
  const wms = await queryWms(po.id)
  if (!wms) {
    fail('wms', 'No WMS receipt found for this PO')
    const explanation = `No warehouse receipt found for PO ${po.po_number}. Cannot verify quantities without a WMS record.`
    const result = await saveResult(invoiceId, 'ESCALATED', 'LOW_CONFIDENCE', 0.5, explanation, undefined, undefined, traceId)
    return buildResult(invoiceId, result, trace, Date.now() - start)
  }
  const totalReceived = wms.line_items.reduce((s, li) => s + li.received_qty, 0)
  done('wms', `${totalReceived} total units received`)

  // --- Step 6: Fuzzy vendor match ---
  step('vendor', `fuzzy_match_vendor("${extracted.vendor_name}", "${po.vendor_name}")`)
  const vendorMatch = await fuzzyMatchVendor(extracted.vendor_name, po.vendor_name)
  done('vendor', `similarity ${vendorMatch.similarity.toFixed(3)} — ${vendorMatch.isMatch ? 'match' : 'mismatch'}${vendorMatch.isSuspicious ? ' ⚠ suspicious' : ''}`)

  // --- Step 7: FX conversion (only if currencies differ) ---
  let fxResult
  if (extracted.currency !== po.currency) {
    step('fx', `convert_currency(${extracted.currency} → ${po.currency})`)
    try {
      fxResult = await convertCurrency(1, extracted.currency, po.currency)
      done('fx', `1 ${extracted.currency} = ${fxResult.rate} ${po.currency} (${fxResult.source})`)
    } catch (err) {
      fail('fx', String(err))
    }
  }

  // --- Step 8: Reason and decide ---
  step('decide', 'reason_and_decide()')
  const decision = await reasonAndDecide({ extracted, po, wms, vendorMatch, fxResult })
  done('decide', `${decision.status}${decision.flag_reason ? ` — ${decision.flag_reason}` : ''} (${Math.round(decision.confidence * 100)}% confidence)`)

  // --- Persist ---
  const result = await saveResult(
    invoiceId,
    decision.status,
    decision.flag_reason,
    decision.confidence,
    decision.explanation,
    po.id,
    wms.id,
    traceId,
  )

  return buildResult(invoiceId, result, trace, Date.now() - start)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function saveResult(
  invoiceId: string,
  status: string,
  flagReason: string | null,
  confidence: number,
  explanation: string,
  poId?: string,
  wmsId?: string,
  traceId?: string | null,
) {
  const invoiceStatus = status === 'APPROVED' ? 'approved' : status === 'FLAGGED' ? 'flagged' : 'escalated'
  await updateInvoiceStatus(invoiceId, invoiceStatus as 'approved' | 'flagged' | 'escalated')

  const result = {
    id: randomUUID(),
    invoice_id: invoiceId,
    po_id: poId ?? null,
    wms_id: wmsId ?? null,
    status: status as 'APPROVED' | 'FLAGGED' | 'ESCALATED',
    flag_reason: flagReason as Parameters<typeof insertMatchResult>[0]['flag_reason'],
    confidence,
    explanation,
    trace_id: traceId ?? null,
    matched_at: new Date().toISOString(),
  }
  await insertMatchResult(result)
  return result
}

function buildResult(
  invoiceId: string,
  result: Awaited<ReturnType<typeof saveResult>>,
  trace: TraceEvent[],
  durationMs: number,
): AgentResult {
  return {
    invoiceId,
    status: result.status,
    flag_reason: result.flag_reason,
    confidence: result.confidence,
    explanation: result.explanation,
    trace,
    durationMs,
    traceId: result.trace_id,
  }
}
