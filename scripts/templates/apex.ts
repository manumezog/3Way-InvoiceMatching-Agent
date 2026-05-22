import type { InvoiceRenderData } from './types'

export function apexTemplate(d: InvoiceRenderData): string {
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
  body { font-family: 'Arial', sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; padding: 40px 48px; width: 900px; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 36px; }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-mark { width: 48px; height: 48px; background: #16a34a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: 700; letter-spacing: -1px; }
  .company-name { font-size: 20px; font-weight: 700; color: #16a34a; }
  .company-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .invoice-title { text-align: right; }
  .invoice-title h1 { font-size: 28px; font-weight: 800; color: #16a34a; letter-spacing: -1px; }
  .invoice-title .inv-num { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .divider { border: none; border-top: 2px solid #16a34a; margin: 0 0 28px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .meta-block label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; display: block; margin-bottom: 4px; }
  .meta-block p { font-size: 13px; color: #111827; line-height: 1.5; }
  .meta-block .highlight { font-size: 14px; font-weight: 700; color: #16a34a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead { background: #16a34a; color: white; }
  thead th { padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-align: left; }
  thead th.num { text-align: right; }
  tbody tr { border-bottom: 1px solid #f3f4f6; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  tbody td { padding: 10px 12px; color: #374151; vertical-align: top; }
  td.sku { font-family: 'Courier New', monospace; font-size: 11px; color: #6b7280; white-space: nowrap; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
  .totals-box { width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
  .totals-row.grand { border-top: 2px solid #16a34a; border-bottom: none; padding-top: 10px; font-weight: 700; font-size: 16px; color: #16a34a; margin-top: 4px; }
  .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer p { font-size: 11px; color: #9ca3af; line-height: 1.6; }
  .thank-you { font-size: 14px; font-weight: 600; color: #16a34a; }
  ${d.notes ? '.notes { background:#f0fdf4; border-left:3px solid #16a34a; padding:12px 16px; margin-bottom:24px; font-size:12px; color:#166534; }' : ''}
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    <div class="logo-mark">AL</div>
    <div>
      <div class="company-name">Apex Logistics</div>
      <div class="company-sub">Global Supply Chain Solutions</div>
    </div>
  </div>
  <div class="invoice-title">
    <h1>INVOICE</h1>
    <div class="inv-num">${d.invoice_number}</div>
  </div>
</div>
<hr class="divider"/>
<div class="meta-grid">
  <div class="meta-block">
    <label>From</label>
    <p>${d.vendor.address}</p>
    <p>${d.vendor.email}</p>
    <p>${d.vendor.phone}</p>
  </div>
  <div class="meta-block">
    <label>Bill To</label>
    <p>${d.bill_to.name}</p>
    <p>${d.bill_to.address}</p>
  </div>
  <div class="meta-block">
    <label>Invoice Date</label>
    <p>${d.invoice_date}</p>
    <label style="margin-top:10px">Due Date</label>
    <p>${d.due_date}</p>
    <label style="margin-top:10px">PO Reference</label>
    <p class="highlight">${d.po_reference}</p>
  </div>
</div>
${d.notes ? `<div class="notes">${d.notes}</div>` : ''}
<table>
  <thead>
    <tr>
      <th>SKU</th><th>Description</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Amount</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="totals">
  <div class="totals-box">
    <div class="totals-row"><span>Subtotal</span><span>${d.currency_symbol}${d.subtotal.toFixed(2)}</span></div>
    <div class="totals-row"><span>Tax (${(d.tax_rate * 100).toFixed(0)}%)</span><span>${d.currency_symbol}${d.tax_amount.toFixed(2)}</span></div>
    <div class="totals-row grand"><span>Total ${d.currency}</span><span>${d.currency_symbol}${d.total.toFixed(2)}</span></div>
  </div>
</div>
<div class="footer">
  <p>Payment due within 30 days of invoice date.<br/>Wire transfer details on file. Ref: ${d.invoice_number}.</p>
  <p class="thank-you">Thank you for your business.</p>
</div>
</body>
</html>`
}
