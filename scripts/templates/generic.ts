import type { InvoiceRenderData } from './types'

export function genericTemplate(d: InvoiceRenderData): string {
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
  body { font-family: 'Trebuchet MS', Arial, sans-serif; font-size: 13px; color: #27272a; background: #fff; padding: 40px 48px; width: 900px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 1px solid #e4e4e7; padding-bottom: 24px; }
  .logo-block .name { font-size: 22px; font-weight: 800; color: #18181b; }
  .logo-block .tagline { font-size: 11px; color: #a1a1aa; margin-top: 4px; }
  .logo-bar { display: inline-block; width: 40px; height: 4px; background: #6366f1; border-radius: 2px; margin-bottom: 8px; }
  .inv-block { text-align: right; }
  .inv-block .label { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #6366f1; }
  .inv-block .number { font-size: 20px; font-weight: 800; color: #18181b; margin-top: 3px; }
  .inv-block .date { font-size: 12px; color: #71717a; margin-top: 4px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .meta-cell .mlabel { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6366f1; margin-bottom: 6px; }
  .meta-cell p { font-size: 12.5px; color: #3f3f46; line-height: 1.6; }
  .meta-cell .bold { font-weight: 700; font-size: 13px; color: #18181b; }
  ${d.notes ? '.notes { background:#f5f3ff; border:1px solid #c4b5fd; border-radius:6px; padding:12px 16px; margin-bottom:20px; font-size:12px; color:#5b21b6; }' : ''}
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead { background: #18181b; }
  thead th { padding: 9px 12px; color: #f4f4f5; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; text-align: left; }
  thead th.num { text-align: right; }
  tbody tr { border-bottom: 1px solid #f4f4f5; }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody td { padding: 9px 12px; font-size: 12.5px; color: #3f3f46; vertical-align: top; }
  td.sku { font-family: 'Courier New', monospace; font-size: 13px; font-weight: 700; color: #3f3f46; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
  .totals-inner { width: 260px; }
  .tr { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12.5px; color: #52525b; border-bottom: 1px solid #f4f4f5; }
  .tr.grand { border-top: 2px solid #6366f1; border-bottom: none; padding-top: 10px; font-weight: 800; font-size: 16px; color: #6366f1; }
  .footer-bar { background: #18181b; margin: 0 -48px -40px; padding: 14px 48px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
  .footer-bar p { font-size: 11px; color: #71717a; }
  .footer-bar .right { color: #a1a1aa; font-size: 11px; }
</style>
</head>
<body>
<div class="header">
  <div class="logo-block">
    <div class="logo-bar"></div>
    <div class="name">${d.vendor.name}</div>
    <div class="tagline">Professional Invoice</div>
  </div>
  <div class="inv-block">
    <div class="label">Invoice</div>
    <div class="number">${d.invoice_number}</div>
    <div class="date">Issued: ${d.invoice_date}</div>
  </div>
</div>
<div class="meta">
  <div class="meta-cell">
    <div class="mlabel">From</div>
    <p>${d.vendor.address}</p>
    <p>${d.vendor.email}</p>
    <p>${d.vendor.phone}</p>
  </div>
  <div class="meta-cell">
    <div class="mlabel">Bill To</div>
    <p>${d.bill_to.name}</p>
    <p>${d.bill_to.address}</p>
  </div>
  <div class="meta-cell">
    <div class="mlabel">Details</div>
    <p>Date: ${d.invoice_date}</p>
    <p>Due: ${d.due_date}</p>
    <p>PO: <span class="bold">${d.po_reference}</span></p>
    <p>Currency: ${d.currency}</p>
  </div>
</div>
${d.notes ? `<div class="notes">${d.notes}</div>` : ''}
<table>
  <thead>
    <tr><th>SKU</th><th>Description</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Amount</th></tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="totals">
  <div class="totals-inner">
    <div class="tr"><span>Subtotal</span><span>${d.currency_symbol}${d.subtotal.toFixed(2)}</span></div>
    <div class="tr"><span>Tax (${(d.tax_rate * 100).toFixed(0)}%)</span><span>${d.currency_symbol}${d.tax_amount.toFixed(2)}</span></div>
    <div class="tr grand"><span>Total ${d.currency}</span><span>${d.currency_symbol}${d.total.toFixed(2)}</span></div>
  </div>
</div>
<div class="footer-bar">
  <p>Payment due ${d.due_date} · Net 30 terms · Ref: ${d.invoice_number}</p>
  <span class="right">Thank you.</span>
</div>
</body>
</html>`
}
