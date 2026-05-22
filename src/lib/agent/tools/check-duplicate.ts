import { isPostgres, getDb, getNeon } from '@/lib/db/client'

export interface DuplicateCheckResult {
  isDuplicate: boolean
  previousMatchId?: string
  previousStatus?: string
  detail: string
}

export async function checkDuplicate(invoiceNumber: string): Promise<DuplicateCheckResult> {
  let row: { id: string; status: string } | undefined

  if (isPostgres()) {
    const sql  = getNeon()
    const rows = await sql`
      SELECT mr.id, mr.status
      FROM match_results mr
      JOIN invoices i ON i.id = mr.invoice_id
      WHERE i.invoice_number = ${invoiceNumber}
      ORDER BY mr.matched_at DESC
      LIMIT 1
    ` as { id: string; status: string }[]
    row = rows[0]
  } else {
    row = getDb().prepare(`
      SELECT mr.id, mr.status
      FROM match_results mr
      JOIN invoices i ON i.id = mr.invoice_id
      WHERE i.invoice_number = ?
      ORDER BY mr.matched_at DESC
      LIMIT 1
    `).get(invoiceNumber) as { id: string; status: string } | undefined
  }

  if (row) {
    return {
      isDuplicate: true,
      previousMatchId: row.id,
      previousStatus: row.status,
      detail: `Invoice ${invoiceNumber} was previously processed with status: ${row.status}. This appears to be a duplicate submission.`,
    }
  }

  return { isDuplicate: false, detail: `Invoice ${invoiceNumber} has not been processed before.` }
}
