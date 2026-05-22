import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import { getFlashModel } from '@/lib/agent/gemini'

const ExtractedInvoiceSchema = z.object({
  invoice_number: z.string(),
  vendor_name: z.string(),
  po_reference: z.string().nullable(),
  currency: z.string().default('USD'),
  line_items: z.array(z.object({
    sku: z.string(),
    description: z.string(),
    qty: z.number(),
    unit_price: z.number(),
  })),
  subtotal: z.number(),
  tax_amount: z.number(),
  total: z.number(),
  invoice_date: z.string().nullable(),
  notes: z.string().nullable(),
})

export type ExtractedInvoice = z.infer<typeof ExtractedInvoiceSchema>

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
- SKU codes are alphanumeric identifiers — transcribe them character-by-character exactly as printed. Do NOT substitute visually similar characters: letter O ≠ digit 0, letter Q ≠ digit 0, letter I ≠ digit 1, letter B ≠ digit 8. When in doubt about a character, prefer the letter over the digit in a SKU context.`

export async function extractPdf(pdfPath: string): Promise<ExtractedInvoice> {
  const absPath = pdfPath.startsWith('/')
    ? path.join(process.cwd(), 'public', pdfPath)
    : path.join(process.cwd(), 'public', pdfPath)

  const fileBytes = fs.readFileSync(absPath)
  const base64 = fileBytes.toString('base64')

  const model = getFlashModel()
  const result = await model.generateContent([
    EXTRACTION_PROMPT,
    { inlineData: { mimeType: 'application/pdf', data: base64 } },
  ])

  const raw = result.response.text().trim()
  // Strip markdown code fences if model wraps response
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

  const parsed = JSON.parse(json)
  return ExtractedInvoiceSchema.parse(parsed)
}
