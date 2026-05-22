import { getPOByNumber, getAllPOs } from '@/lib/db/repo'
import type { PurchaseOrder } from '@/lib/schemas/entities'

export async function lookupPo(poNumber: string): Promise<PurchaseOrder | null> {
  return getPOByNumber(poNumber)
}

export async function lookupPoByVendor(vendorName: string): Promise<PurchaseOrder[]> {
  const all = await getAllPOs()
  return all.filter(po =>
    po.vendor_name.toLowerCase().includes(vendorName.toLowerCase())
  )
}
