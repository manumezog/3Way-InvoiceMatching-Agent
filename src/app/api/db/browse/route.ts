import { NextResponse } from 'next/server'
import { getAllPOs, getAllInvoices, getAllMatchResults } from '@/lib/db/repo'
import { isPostgres, getDb, getNeon } from '@/lib/db/client'
import { runMigrationsAsync } from '@/lib/db/migrate'
import { WmsReceiptSchema } from '@/lib/schemas/entities'
import type { WmsReceipt } from '@/lib/schemas/entities'

export const dynamic = 'force-dynamic'

async function getAllWmsReceipts(): Promise<WmsReceipt[]> {
  const parse = (rows: Record<string, unknown>[]) =>
    rows.map(r => {
      const parsed = { ...r }
      if (typeof parsed.line_items === 'string') parsed.line_items = JSON.parse(parsed.line_items)
      return WmsReceiptSchema.parse(parsed)
    })

  if (isPostgres()) {
    const sql = getNeon()
    const rows = await sql`SELECT * FROM wms_receipts ORDER BY received_at DESC` as Record<string, unknown>[]
    return parse(rows)
  }
  const rows = getDb().prepare('SELECT * FROM wms_receipts ORDER BY received_at DESC').all() as Record<string, unknown>[]
  return parse(rows)
}

export async function GET(): Promise<NextResponse> {
  await runMigrationsAsync()
  const [pos, wmsReceipts, invoices, matchResults] = await Promise.all([
    getAllPOs(),
    getAllWmsReceipts(),
    getAllInvoices(),
    getAllMatchResults(),
  ])
  return NextResponse.json({ pos, wmsReceipts, invoices, matchResults })
}
