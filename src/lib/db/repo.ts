import { isPostgres, getDb, getNeon } from './client'
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

export { getDb } from './client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function serialize(items: unknown): string { return JSON.stringify(items) }

function parseRow<T>(schema: { parse: (v: unknown) => T }, row: Record<string, unknown>): T {
  const parsed = { ...row }
  // SQLite stores JSON as text; Neon (JSONB) returns parsed objects already
  if (typeof parsed.line_items === 'string') parsed.line_items = JSON.parse(parsed.line_items)
  return schema.parse(parsed)
}

// ---------------------------------------------------------------------------
// Dual-mode query helpers
// ---------------------------------------------------------------------------
async function queryOne<T>(
  schema: { parse: (v: unknown) => T },
  sqliteQuery: () => Record<string, unknown> | undefined,
  pgQuery: () => Promise<Record<string, unknown>[]>,
): Promise<T | null> {
  if (isPostgres()) {
    const rows = await pgQuery()
    return rows.length ? parseRow(schema, rows[0]) : null
  }
  const row = sqliteQuery()
  return row ? parseRow(schema, row) : null
}

async function queryAll<T>(
  schema: { parse: (v: unknown) => T },
  sqliteQuery: () => Record<string, unknown>[],
  pgQuery: () => Promise<Record<string, unknown>[]>,
): Promise<T[]> {
  if (isPostgres()) {
    const rows = await pgQuery()
    return rows.map(r => parseRow(schema, r))
  }
  return sqliteQuery().map(r => parseRow(schema, r))
}

async function exec(
  sqliteExec: () => void,
  pgExec: () => Promise<unknown>,
): Promise<void> {
  if (isPostgres()) { await pgExec(); return }
  sqliteExec()
}

// ---------------------------------------------------------------------------
// Purchase Orders
// ---------------------------------------------------------------------------
export async function insertPO(po: PurchaseOrder): Promise<void> {
  await exec(
    () => getDb().prepare(`
      INSERT OR REPLACE INTO purchase_orders (id, po_number, vendor_name, currency, line_items, created_at)
      VALUES (@id, @po_number, @vendor_name, @currency, @line_items, @created_at)
    `).run({ ...po, line_items: serialize(po.line_items) }),
    async () => {
      const sql = getNeon()
      await sql`
        INSERT INTO purchase_orders (id, po_number, vendor_name, currency, line_items, created_at)
        VALUES (${po.id}, ${po.po_number}, ${po.vendor_name}, ${po.currency}, ${serialize(po.line_items)}, ${po.created_at})
        ON CONFLICT (id) DO UPDATE SET
          po_number = EXCLUDED.po_number, vendor_name = EXCLUDED.vendor_name,
          currency = EXCLUDED.currency, line_items = EXCLUDED.line_items
      `
    },
  )
}

export async function getPOById(id: string): Promise<PurchaseOrder | null> {
  return queryOne(
    PurchaseOrderSchema,
    () => getDb().prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as Record<string, unknown> | undefined,
    async () => { const sql = getNeon(); return sql`SELECT * FROM purchase_orders WHERE id = ${id}` as Promise<Record<string, unknown>[]> },
  )
}

export async function getPOByNumber(po_number: string): Promise<PurchaseOrder | null> {
  return queryOne(
    PurchaseOrderSchema,
    () => getDb().prepare('SELECT * FROM purchase_orders WHERE po_number = ?').get(po_number) as Record<string, unknown> | undefined,
    async () => { const sql = getNeon(); return sql`SELECT * FROM purchase_orders WHERE po_number = ${po_number}` as Promise<Record<string, unknown>[]> },
  )
}

export async function getAllPOs(): Promise<PurchaseOrder[]> {
  return queryAll(
    PurchaseOrderSchema,
    () => getDb().prepare('SELECT * FROM purchase_orders ORDER BY created_at DESC').all() as Record<string, unknown>[],
    async () => { const sql = getNeon(); return sql`SELECT * FROM purchase_orders ORDER BY created_at DESC` as Promise<Record<string, unknown>[]> },
  )
}

// ---------------------------------------------------------------------------
// WMS Receipts
// ---------------------------------------------------------------------------
export async function insertWmsReceipt(receipt: WmsReceipt): Promise<void> {
  await exec(
    () => getDb().prepare(`
      INSERT OR REPLACE INTO wms_receipts (id, po_id, received_at, line_items)
      VALUES (@id, @po_id, @received_at, @line_items)
    `).run({ ...receipt, line_items: serialize(receipt.line_items) }),
    async () => {
      const sql = getNeon()
      await sql`
        INSERT INTO wms_receipts (id, po_id, received_at, line_items)
        VALUES (${receipt.id}, ${receipt.po_id}, ${receipt.received_at}, ${serialize(receipt.line_items)})
        ON CONFLICT (id) DO UPDATE SET line_items = EXCLUDED.line_items
      `
    },
  )
}

export async function getWmsReceiptByPoId(po_id: string): Promise<WmsReceipt | null> {
  return queryOne(
    WmsReceiptSchema,
    () => getDb().prepare('SELECT * FROM wms_receipts WHERE po_id = ? ORDER BY received_at DESC LIMIT 1').get(po_id) as Record<string, unknown> | undefined,
    async () => { const sql = getNeon(); return sql`SELECT * FROM wms_receipts WHERE po_id = ${po_id} ORDER BY received_at DESC LIMIT 1` as Promise<Record<string, unknown>[]> },
  )
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
export async function insertInvoice(invoice: Invoice): Promise<void> {
  await exec(
    () => getDb().prepare(`
      INSERT INTO invoices (id, invoice_number, vendor_name, currency, pdf_path, line_items, status, scenario_id, created_at)
      VALUES (@id, @invoice_number, @vendor_name, @currency, @pdf_path, @line_items, @status, @scenario_id, @created_at)
    `).run({ ...invoice, line_items: serialize(invoice.line_items) }),
    async () => {
      const sql = getNeon()
      await sql`
        INSERT INTO invoices (id, invoice_number, vendor_name, currency, pdf_path, line_items, status, scenario_id, created_at)
        VALUES (${invoice.id}, ${invoice.invoice_number}, ${invoice.vendor_name}, ${invoice.currency},
                ${invoice.pdf_path}, ${serialize(invoice.line_items)}, ${invoice.status},
                ${invoice.scenario_id ?? null}, ${invoice.created_at})
      `
    },
  )
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  await exec(
    () => getDb().prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, id),
    async () => { const sql = getNeon(); await sql`UPDATE invoices SET status = ${status} WHERE id = ${id}` },
  )
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  return queryOne(
    InvoiceSchema,
    () => getDb().prepare('SELECT * FROM invoices WHERE id = ?').get(id) as Record<string, unknown> | undefined,
    async () => { const sql = getNeon(); return sql`SELECT * FROM invoices WHERE id = ${id}` as Promise<Record<string, unknown>[]> },
  )
}

export async function getAllInvoices(): Promise<Invoice[]> {
  return queryAll(
    InvoiceSchema,
    () => getDb().prepare('SELECT * FROM invoices ORDER BY created_at DESC').all() as Record<string, unknown>[],
    async () => { const sql = getNeon(); return sql`SELECT * FROM invoices ORDER BY created_at DESC` as Promise<Record<string, unknown>[]> },
  )
}

export async function getInvoiceByHash(hash: string): Promise<Invoice | null> {
  return queryOne(
    InvoiceSchema,
    () => getDb().prepare('SELECT * FROM invoices WHERE invoice_number = ?').get(hash) as Record<string, unknown> | undefined,
    async () => { const sql = getNeon(); return sql`SELECT * FROM invoices WHERE invoice_number = ${hash}` as Promise<Record<string, unknown>[]> },
  )
}

// ---------------------------------------------------------------------------
// Match Results
// ---------------------------------------------------------------------------
export async function clearMatchResultsForInvoice(invoiceId: string): Promise<void> {
  await exec(
    () => {
      getDb().prepare('DELETE FROM match_results WHERE invoice_id = ?').run(invoiceId)
      getDb().prepare("UPDATE invoices SET status = 'pending' WHERE id = ?").run(invoiceId)
    },
    async () => {
      const sql = getNeon()
      await sql`DELETE FROM match_results WHERE invoice_id = ${invoiceId}`
      await sql`UPDATE invoices SET status = 'pending' WHERE id = ${invoiceId}`
    },
  )
}

export async function clearMatchResults(): Promise<void> {
  await exec(
    () => {
      getDb().prepare('DELETE FROM match_results').run()
      getDb().prepare("UPDATE invoices SET status = 'pending'").run()
    },
    async () => {
      const sql = getNeon()
      await sql`DELETE FROM match_results`
      await sql`UPDATE invoices SET status = 'pending'`
    },
  )
}

export async function insertMatchResult(result: MatchResult): Promise<void> {
  await exec(
    () => getDb().prepare(`
      INSERT OR REPLACE INTO match_results
        (id, invoice_id, po_id, wms_id, status, flag_reason, confidence, explanation, trace_id, matched_at)
      VALUES
        (@id, @invoice_id, @po_id, @wms_id, @status, @flag_reason, @confidence, @explanation, @trace_id, @matched_at)
    `).run(result),
    async () => {
      const sql = getNeon()
      await sql`
        INSERT INTO match_results (id, invoice_id, po_id, wms_id, status, flag_reason, confidence, explanation, trace_id, matched_at)
        VALUES (${result.id}, ${result.invoice_id}, ${result.po_id ?? null}, ${result.wms_id ?? null},
                ${result.status}, ${result.flag_reason ?? null}, ${result.confidence},
                ${result.explanation}, ${result.trace_id ?? null}, ${result.matched_at})
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status, confidence = EXCLUDED.confidence,
          explanation = EXCLUDED.explanation, matched_at = EXCLUDED.matched_at
      `
    },
  )
}

export async function getMatchResultByInvoiceId(invoice_id: string): Promise<MatchResult | null> {
  return queryOne(
    MatchResultSchema,
    () => getDb().prepare('SELECT * FROM match_results WHERE invoice_id = ? ORDER BY matched_at DESC LIMIT 1').get(invoice_id) as Record<string, unknown> | undefined,
    async () => { const sql = getNeon(); return sql`SELECT * FROM match_results WHERE invoice_id = ${invoice_id} ORDER BY matched_at DESC LIMIT 1` as Promise<Record<string, unknown>[]> },
  )
}

export async function getAllMatchResults(): Promise<MatchResult[]> {
  return queryAll(
    MatchResultSchema,
    () => getDb().prepare('SELECT * FROM match_results ORDER BY matched_at DESC').all() as Record<string, unknown>[],
    async () => { const sql = getNeon(); return sql`SELECT * FROM match_results ORDER BY matched_at DESC` as Promise<Record<string, unknown>[]> },
  )
}
