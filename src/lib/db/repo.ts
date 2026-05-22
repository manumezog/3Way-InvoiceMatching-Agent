export { getDb } from './client'
import { getDb } from './client'
import type {
  PurchaseOrder,
  WmsReceipt,
  Invoice,
  MatchResult,
  InvoiceStatus,
} from '@/lib/schemas/entities'
import {
  PurchaseOrderSchema,
  WmsReceiptSchema,
  InvoiceSchema,
  MatchResultSchema,
} from '@/lib/schemas/entities'

// ---------------------------------------------------------------------------
// Helpers — serialize / deserialize JSON columns
// ---------------------------------------------------------------------------

function serializeLineItems(items: unknown[]): string {
  return JSON.stringify(items)
}

function parseRow<T>(schema: { parse: (v: unknown) => T }, row: Record<string, unknown>): T {
  const parsed = { ...row }
  if (typeof parsed.line_items === 'string') parsed.line_items = JSON.parse(parsed.line_items)
  return schema.parse(parsed)
}

// ---------------------------------------------------------------------------
// Purchase Orders
// ---------------------------------------------------------------------------

export function insertPO(po: PurchaseOrder): void {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO purchase_orders (id, po_number, vendor_name, currency, line_items, created_at)
    VALUES (@id, @po_number, @vendor_name, @currency, @line_items, @created_at)
  `).run({ ...po, line_items: serializeLineItems(po.line_items) })
}

export function getPOById(id: string): PurchaseOrder | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? parseRow(PurchaseOrderSchema, row) : null
}

export function getPOByNumber(po_number: string): PurchaseOrder | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM purchase_orders WHERE po_number = ?').get(po_number) as Record<string, unknown> | undefined
  return row ? parseRow(PurchaseOrderSchema, row) : null
}

export function getAllPOs(): PurchaseOrder[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM purchase_orders ORDER BY created_at DESC').all() as Record<string, unknown>[]
  return rows.map(r => parseRow(PurchaseOrderSchema, r))
}

// ---------------------------------------------------------------------------
// WMS Receipts
// ---------------------------------------------------------------------------

export function insertWmsReceipt(receipt: WmsReceipt): void {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO wms_receipts (id, po_id, received_at, line_items)
    VALUES (@id, @po_id, @received_at, @line_items)
  `).run({ ...receipt, line_items: serializeLineItems(receipt.line_items) })
}

export function getWmsReceiptByPoId(po_id: string): WmsReceipt | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM wms_receipts WHERE po_id = ? ORDER BY received_at DESC LIMIT 1').get(po_id) as Record<string, unknown> | undefined
  return row ? parseRow(WmsReceiptSchema, row) : null
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export function insertInvoice(invoice: Invoice): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO invoices
      (id, invoice_number, vendor_name, currency, pdf_path, line_items, status, scenario_id, created_at)
    VALUES
      (@id, @invoice_number, @vendor_name, @currency, @pdf_path, @line_items, @status, @scenario_id, @created_at)
  `).run({ ...invoice, line_items: serializeLineItems(invoice.line_items) })
}

export function updateInvoiceStatus(id: string, status: InvoiceStatus): void {
  getDb().prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, id)
}

export function getInvoiceById(id: string): Invoice | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? parseRow(InvoiceSchema, row) : null
}

export function getAllInvoices(): Invoice[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all() as Record<string, unknown>[]
  return rows.map(r => parseRow(InvoiceSchema, r))
}

export function getInvoiceByHash(hash: string): Invoice | null {
  // Used for duplicate detection — hash is stored in invoice_number for now
  const db = getDb()
  const row = db.prepare('SELECT * FROM invoices WHERE invoice_number = ?').get(hash) as Record<string, unknown> | undefined
  return row ? parseRow(InvoiceSchema, row) : null
}

// ---------------------------------------------------------------------------
// Match Results
// ---------------------------------------------------------------------------

export function clearMatchResults(): void {
  getDb().prepare('DELETE FROM match_results').run()
  // Also reset invoice statuses so the agent processes them fresh
  getDb().prepare("UPDATE invoices SET status = 'pending'").run()
}

export function insertMatchResult(result: MatchResult): void {
  getDb().prepare(`
    INSERT OR REPLACE INTO match_results
      (id, invoice_id, po_id, wms_id, status, flag_reason, confidence, explanation, trace_id, matched_at)
    VALUES
      (@id, @invoice_id, @po_id, @wms_id, @status, @flag_reason, @confidence, @explanation, @trace_id, @matched_at)
  `).run(result)
}

export function getMatchResultByInvoiceId(invoice_id: string): MatchResult | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM match_results WHERE invoice_id = ? ORDER BY matched_at DESC LIMIT 1').get(invoice_id) as Record<string, unknown> | undefined
  return row ? MatchResultSchema.parse(row) : null
}

export function getAllMatchResults(): MatchResult[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM match_results ORDER BY matched_at DESC').all() as Record<string, unknown>[]
  return rows.map(r => MatchResultSchema.parse(r))
}
