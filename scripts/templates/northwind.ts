import type { InvoiceRenderData } from './types'

export function northwindTemplate(d: InvoiceRenderData): string {
  const rows = d.line_items.map(li => `
    <tr>
      <td class="sku">${li.sku}</td>
      <td>${li.description}</td>
      <td class="num">${li.qty}</td>
      <td class="num">${d.currency_symbol}${li.unit_price.toFixed(2)}</td>
      <td class="num">${d.currency_symbol}${(li.qty * li.unit_price).toFixed(2)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #1e293b; background: #fff; padding: 40px 48px; width: 900px; }
  .header { background: #1e3a5f; color: white; margin: -40px -48px 32px; padding: 28px 48px; display: flex; justify-content: space-between; align-items: center; }
  .logo { display: flex; align-items: center; gap: 14px; }
  .logo-mark { width: 52px; height: 52px; background: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
  .logo-inner { font-size: 22px; font-weight: 900; color: #1e3a5f; letter-spacing: -2px; font-family: Arial, sans-serif; }
  .company-name { font-size: 18px; font-weight: 700; font-family: Arial, sans-serif; }
  .company-tagline { font-size: 10px; color: #93c5fd; margin-top: 3px; font-family: Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
  .invoice-badge { text-align: right; }
  .invoice-badge h1 { font-size: 24px; font-weight: 700; font-family: Arial, sans-serif; letter-spacing: 2px; color: #93c5fd; }
  .invoice-badge .num { font-size: 12px; color: #bfdbfe; margin-top: 4px; font-family: Arial, sans-serif; }
  .info-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
  .info-block label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #1e3a5f; display: block; margin-bottom: 6px; font-family: Arial, sans-serif; }
  .info-block p { font-size: 12.5px; line-height: 1.6; color: #334155; }
  .info-block .ref { font-family: Arial, sans-serif; font-weight: 700; color: #1e3a5f; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; }
  thead th { padding: 9px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: white; background: #1e3a5f; text-align: left; font-weight: 600; }
  thead th.num { text-align: right; }
  tbody td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; color: #334155; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  td.sku { font-family: 'Courier New', monospace; font-size: 11px; color: #64748b; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: Arial, sans-serif; }
  .totals { margin-left: auto; width: 260px; margin-bottom: 28px; font-family: Arial, sans-serif; }
  .tr { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12.5px; color: #475569; border-bottom: 1px solid #f1f5f9; }
  .tr.grand { border-top: 2px solid #1e3a5f; border-bottom: none; padding-top: 8px; font-weight: 700; font-size: 15px; color: #1e3a5f; }
  .footer { font-family: Arial, sans-serif; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; line-height: 1.7; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    <div class="logo-mark"><div class="logo-inner">NW</div></div>
    <div>
      <div class="company-name">Northwind Components</div>
      <div class="company-tagline">Precision Parts &amp; Electronics Distribution</div>
    </div>
  </div>
  <div class="invoice-badge">
    <h1>INVOICE</h1>
    <div class="num">${d.invoice_number}</div>
  </div>
</div>
<div class="info-row">
  <div class="info-block">
    <label>Vendor Details</label>
    <p>${d.vendor.address}</p>
    <p>${d.vendor.email}</p>
    <p>${d.vendor.phone}</p>
  </div>
  <div class="info-block">
    <label>Bill To</label>
    <p>${d.bill_to.name}</p>
    <p>${d.bill_to.address}</p>
  </div>
  <div class="info-block">
    <label>Invoice Date</label><p>${d.invoice_date}</p>
    <label style="margin-top:8px">Payment Due</label><p>${d.due_date}</p>
    <label style="margin-top:8px">Purchase Order</label><p class="ref">${d.po_reference}</p>
  </div>
</div>
<table>
  <thead>
    <tr><th>SKU</th><th>Description</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Line Total</th></tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="totals">
  <div class="tr"><span>Subtotal</span><span>${d.currency_symbol}${d.subtotal.toFixed(2)}</span></div>
  <div class="tr"><span>Tax (${(d.tax_rate * 100).toFixed(0)}%)</span><span>${d.currency_symbol}${d.tax_amount.toFixed(2)}</span></div>
  <div class="tr grand"><span>Amount Due (${d.currency})</span><span>${d.currency_symbol}${d.total.toFixed(2)}</span></div>
</div>
<div class="footer">
  Northwind Components LLC · Registered in Delaware · Payment terms: Net 30<br/>
  Please reference invoice number ${d.invoice_number} on all correspondence and remittances.
</div>
</body>
</html>`
}
