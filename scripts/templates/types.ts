export interface InvoiceLineItem {
  sku: string
  description: string
  qty: number
  unit_price: number
}

export interface InvoiceRenderData {
  invoice_number: string
  po_reference: string
  invoice_date: string
  due_date: string
  vendor: { name: string; address: string; email: string; phone: string }
  bill_to: { name: string; address: string }
  line_items: InvoiceLineItem[]
  currency: string
  currency_symbol: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes?: string
}

export type TemplateKey = 'apex' | 'northwind' | 'eurotech' | 'crestline' | 'generic'
