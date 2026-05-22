import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export const LineItemSchema = z.object({
  sku: z.string(),
  description: z.string(),
  qty: z.number().positive(),
  unit_price: z.number().nonnegative(),
})
export type LineItem = z.infer<typeof LineItemSchema>

export const WmsLineItemSchema = z.object({
  sku: z.string(),
  received_qty: z.number().nonnegative(),
})
export type WmsLineItem = z.infer<typeof WmsLineItemSchema>

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export const PurchaseOrderSchema = z.object({
  id: z.string(),
  po_number: z.string(),
  vendor_name: z.string(),
  currency: z.string().default('USD'),
  line_items: z.array(LineItemSchema),
  created_at: z.string(),
})
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>

export const WmsReceiptSchema = z.object({
  id: z.string(),
  po_id: z.string(),
  received_at: z.string(),
  line_items: z.array(WmsLineItemSchema),
})
export type WmsReceipt = z.infer<typeof WmsReceiptSchema>

export const InvoiceStatusSchema = z.enum(['pending', 'approved', 'flagged', 'escalated'])
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>

export const InvoiceSchema = z.object({
  id: z.string(),
  invoice_number: z.string(),
  vendor_name: z.string(),
  currency: z.string().default('USD'),
  pdf_path: z.string(),
  line_items: z.array(LineItemSchema),
  status: InvoiceStatusSchema,
  scenario_id: z.string().nullable(),
  created_at: z.string(),
})
export type Invoice = z.infer<typeof InvoiceSchema>

export const MatchStatusSchema = z.enum(['APPROVED', 'FLAGGED', 'ESCALATED'])
export type MatchStatus = z.infer<typeof MatchStatusSchema>

export const FlagReasonSchema = z.enum([
  'SHORTAGE',
  'PRICE_MISMATCH',
  'VENDOR_MISMATCH',
  'DUPLICATE',
  'UNAUTHORIZED_ITEMS',
  'FX_CONVERSION',
  'TAX_MISMATCH',
  'LOW_CONFIDENCE',
]).nullable()
export type FlagReason = z.infer<typeof FlagReasonSchema>

export const MatchResultSchema = z.object({
  id: z.string(),
  invoice_id: z.string(),
  po_id: z.string().nullable(),
  wms_id: z.string().nullable(),
  status: MatchStatusSchema,
  flag_reason: FlagReasonSchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  trace_id: z.string().nullable(),
  matched_at: z.string(),
})
export type MatchResult = z.infer<typeof MatchResultSchema>

// ---------------------------------------------------------------------------
// Scenario (used by seed script + Eval Mode ground-truth labels)
// ---------------------------------------------------------------------------

export const ScenarioDifficultySchema = z.enum(['easy', 'medium', 'hard'])
export type ScenarioDifficulty = z.infer<typeof ScenarioDifficultySchema>

export const ScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  difficulty: ScenarioDifficultySchema,
  skill_tag: z.string(),          // e.g. "Vision OCR", "Fuzzy Matching"
  pdf_variant: z.string(),        // e.g. "clean" | "scanned" | "photo" | "handwritten" | "crumpled"
  ground_truth: z.object({
    status: MatchStatusSchema,
    flag_reason: FlagReasonSchema,
  }),
  purchase_order: PurchaseOrderSchema.omit({ id: true, created_at: true }),
  wms_receipt: WmsReceiptSchema.omit({ id: true, po_id: true, received_at: true }),
  invoice: InvoiceSchema.omit({ id: true, pdf_path: true, status: true, scenario_id: true, created_at: true }),
})
export type Scenario = z.infer<typeof ScenarioSchema>
