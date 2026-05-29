import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import { getFlashModel } from '@/lib/agent/gemini'
import { getLangfuse, buildTraceUrl } from '@/lib/agent/langfuse'
import { insertPO, insertWmsReceipt, insertInvoice, getPOByNumber, countRunsToday } from '@/lib/db/repo'
import { runMigrationsAsync } from '@/lib/db/migrate'
import { env } from '@/lib/env'
import { runAgent } from '@/lib/agent/orchestrator'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg':      '.jpg',
  'image/png':       '.png',
  'image/webp':      '.webp',
}

// ---------------------------------------------------------------------------
// Extraction schema (same as extract-pdf.ts)
// ---------------------------------------------------------------------------
const ExtractedSchema = z.object({
  invoice_number: z.string(),
  vendor_name:    z.string(),
  po_reference:   z.string().nullable(),
  currency:       z.string().default('USD'),
  line_items: z.array(z.object({
    sku:        z.string(),
    description: z.string(),
    qty:        z.number(),
    unit_price: z.number(),
  })),
  subtotal:     z.number(),
  tax_amount:   z.number(),
  total:        z.number(),
  invoice_date: z.string().nullable(),
  notes:        z.string().nullable(),
})

type Extracted = z.infer<typeof ExtractedSchema>

const EXTRACTION_PROMPT = `You are an invoice data extraction agent. Extract all data from this invoice image and return it as valid JSON only — no markdown, no explanation, just raw JSON.

Required schema:
{
  "invoice_number": "string",
  "vendor_name": "string",
  "po_reference": "string or null",
  "currency": "3-letter ISO code e.g. USD, EUR",
  "line_items": [
    { "sku": "string", "description": "string", "qty": number, "unit_price": number }
  ],
  "subtotal": number,
  "tax_amount": number,
  "total": number,
  "invoice_date": "string or null",
  "notes": "any handwritten annotations or special notes, or null"
}

Rules:
- Extract ALL line items visible
- Numbers must be numeric (not strings)
- If a field is not visible, use null
- For currency, default to USD if not stated
- SKU codes are alphanumeric — transcribe exactly as printed, do not substitute similar characters`

async function extractFromBuffer(buf: Buffer, mimeType: string): Promise<Extracted> {
  const model = getFlashModel()
  const result = await model.generateContent([
    EXTRACTION_PROMPT,
    { inlineData: { mimeType, data: buf.toString('base64') } },
  ])
  const raw = result.response.text().trim()
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  return ExtractedSchema.parse(JSON.parse(json))
}

// ---------------------------------------------------------------------------
// Synthetic PO + WMS generation with one injected discrepancy
// ---------------------------------------------------------------------------
type DiscrepancyType = 'PRICE_VARIANCE' | 'QTY_SHORT' | 'UNAUTHORIZED_ITEM'

interface SyntheticResult {
  discrepancyType: DiscrepancyType
  description: string
  poLineItems: Array<{ sku: string; description: string; qty: number; unit_price: number }>
  wmsLineItems: Array<{ sku: string; received_qty: number }>
}

function synthesize(extracted: Extracted): SyntheticResult {
  const items = extracted.line_items
  const poLineItems = items.map(li => ({ ...li }))
  const wmsLineItems = items.map(li => ({ sku: li.sku, received_qty: li.qty }))

  const types: DiscrepancyType[] = items.length > 1
    ? ['PRICE_VARIANCE', 'QTY_SHORT', 'UNAUTHORIZED_ITEM']
    : ['PRICE_VARIANCE', 'QTY_SHORT']

  const type = types[Math.floor(Math.random() * types.length)]
  const idx = Math.floor(Math.random() * items.length)

  if (type === 'PRICE_VARIANCE') {
    const invoicePrice = items[idx].unit_price
    const agreedPrice  = parseFloat((invoicePrice * 0.82).toFixed(2))
    poLineItems[idx].unit_price = agreedPrice
    return {
      discrepancyType: 'PRICE_VARIANCE',
      description: `PO agreed $${agreedPrice} per unit for "${items[idx].sku}" but invoice charges $${invoicePrice}`,
      poLineItems,
      wmsLineItems,
    }
  }

  if (type === 'QTY_SHORT') {
    const invoicedQty  = items[idx].qty
    const receivedQty  = Math.max(1, Math.floor(invoicedQty * 0.75))
    wmsLineItems[idx].received_qty = receivedQty
    return {
      discrepancyType: 'QTY_SHORT',
      description: `WMS recorded ${receivedQty} units received for "${items[idx].sku}" but invoice claims ${invoicedQty}`,
      poLineItems,
      wmsLineItems,
    }
  }

  // UNAUTHORIZED_ITEM — remove one item from PO (invoice has an extra line)
  const removed = poLineItems.splice(idx, 1)[0]
  wmsLineItems.splice(idx, 1)
  return {
    discrepancyType: 'UNAUTHORIZED_ITEM',
    description: `Invoice includes "${removed.sku} — ${removed.description}" which is not present in the PO`,
    poLineItems,
    wmsLineItems,
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest): Promise<Response> {
  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return new Response('Bad request: expected multipart/form-data', { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return new Response('Missing file field', { status: 400 })
  }

  const mimeType = file.type
  const ext = ALLOWED_TYPES[mimeType]
  if (!ext) {
    return new Response(`Unsupported file type: ${mimeType}`, { status: 415 })
  }

  const runsToday = await countRunsToday()
  if (runsToday >= env.MAX_DAILY_RUNS) {
    return new Response('Daily demo limit reached. Try again tomorrow.', { status: 503 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.byteLength > MAX_BYTES) {
    return new Response('File exceeds 10 MB limit', { status: 413 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      function emit(data: unknown) {
        controller.enqueue(new TextEncoder().encode(sse(data)))
      }

      let savePath: string | null = null

      try {
        await runMigrationsAsync()

        // Save file to /tmp — Vercel's public/ directory is read-only at runtime
        emit({ type: 'status', message: 'Saving uploaded file…' })
        const id  = randomUUID()
        const filename  = `byoi-${id}${ext}`
        savePath  = path.join('/tmp', filename)
        fs.writeFileSync(savePath, buf)
        const pdfPath   = savePath

        // Extract
        emit({ type: 'status', message: 'Extracting invoice data with Gemini Vision…' })
        const extracted = await extractFromBuffer(buf, mimeType)
        emit({
          type:         'extracted',
          vendor_name:  extracted.vendor_name,
          invoice_number: extracted.invoice_number,
          line_item_count: extracted.line_items.length,
          currency:     extracted.currency,
        })

        // Synthesize PO + WMS
        const synthetic = synthesize(extracted)
        const poNumber  = `BYOI-${id.slice(0, 6).toUpperCase()}`
        emit({
          type:             'synthetic',
          discrepancy_type: synthetic.discrepancyType,
          description:      synthetic.description,
          po_number:        poNumber,
        })

        // Insert PO
        const now   = new Date().toISOString()
        const poId  = randomUUID()
        const wmsId = randomUUID()
        const invoiceId = randomUUID()

        // Avoid po_number collision (edge case: same UUID prefix)
        const existingPO = await getPOByNumber(poNumber)
        const resolvedPoId = existingPO ? existingPO.id : poId
        if (!existingPO) {
          await insertPO({
            id:          resolvedPoId,
            po_number:   poNumber,
            vendor_name: extracted.vendor_name,
            currency:    extracted.currency,
            line_items:  synthetic.poLineItems,
            created_at:  now,
          })
        }

        await insertWmsReceipt({
          id:          wmsId,
          po_id:       resolvedPoId,
          received_at: now,
          line_items:  synthetic.wmsLineItems,
        })

        await insertInvoice({
          id:             invoiceId,
          invoice_number: extracted.invoice_number,
          vendor_name:    extracted.vendor_name,
          currency:       extracted.currency,
          pdf_path:       pdfPath,
          line_items:     extracted.line_items,
          status:         'pending',
          scenario_id:    `byoi-${id}`,
          created_at:     now,
        })

        // Langfuse trace (optional)
        const lf = getLangfuse()
        let traceId: string | null = null
        if (lf) {
          const trace = lf.trace({ name: 'byoi-agent-run', metadata: { invoiceId } })
          traceId = trace.id
        }

        // Run agent
        await runAgent(
          invoiceId,
          (event) => emit({ type: 'step', ...event }),
          traceId,
        ).then(async result => {
          const traceUrl = result.traceId ? await buildTraceUrl(result.traceId) : null
          emit({
            type:        'result',
            invoiceId:   result.invoiceId,
            status:      result.status,
            flag_reason: result.flag_reason,
            confidence:  result.confidence,
            explanation: result.explanation,
            durationMs:  result.durationMs,
            traceId:     result.traceId,
            traceUrl,
          })
        })

        emit({ type: 'done' })
      } catch (err) {
        emit({ type: 'error', message: String(err) })
      } finally {
        // Clean up uploaded file — Vercel filesystem is ephemeral anyway,
        // but this prevents accumulation during long-running dev sessions
        if (savePath) {
          try { fs.unlinkSync(savePath) } catch { /* already gone */ }
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
