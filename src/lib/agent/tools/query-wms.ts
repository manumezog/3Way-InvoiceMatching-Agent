import { getWmsReceiptByPoId } from '@/lib/db/repo'
import type { WmsReceipt } from '@/lib/schemas/entities'

export async function queryWms(poId: string): Promise<WmsReceipt | null> {
  return getWmsReceiptByPoId(poId)
}
