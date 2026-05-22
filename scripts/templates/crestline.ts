import type { InvoiceRenderData } from './types'

export function crestlineTemplate(d: InvoiceRenderData): string {
  const rows = d.line_items.map(li => `
    <tr>
      <td class="sku">${li.sku}</td>
      <td>${li.description}</td>
      <td class="num">${li.qty}</td>
      <td class="num">${d.currency_symbol}${li.unit_price.toFixed(2)}</td>
      <td class="num bold">${d.currency_symbol}${(li.qty * li.unit_price).toFixed(2)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1c1917; background: #fff; padding: 0; width: 900px; }
  .header { background: #1c1917; color: white; padding: 28px 48px; display: flex; justify-content: space-between; align-items: center; }
  .logo { display: flex; align-items: center; gap: 14px; }
  .logo-mark { width: 54px; height: 54px; background: #ea580c; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); display: flex; align-items: center; justify-content: center; }
  .logo-letters { font-size: 17px; font-weight: 900; color: white; letter-spacing: -1px; }
  .co-name { font-size: 20px; font-weight: 800; color: white; }
  .co-tag { font-size: 10px; color: #a8a29e; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 4px; }
  .inv-right { text-align: right; }
  .inv-right .word { font-size: 11px; color: #ea580c; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; }
  .inv-right .num { font-size: 22px; font-weight: 800; color: white; margin-top: 2px; }
  .body-wrap { padding: 32px 48px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 3px solid #1c1917; }
  .meta-box .lbl { font-size: 9px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #ea580c; margin-bottom: 6px; }
  .meta-box p { font-size: 12.5px; color: #292524; line-height: 1.55; }
  .meta-box .ref { font-weight: 700; font-size: 14px; color: #1c1917; }
  .alert-bar { background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #ea580c; padding: 10px 16px; margin-bottom: 20px; font-size: 12px; color: #9a3412; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead { background: #1c1917; }
  thead th { padding: 10px 12px; color: white; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-align: left; }
  thead th.num { text-align: right; }
  tbody tr { border-bottom: 1px solid #e7e5e4; }
  tbody tr:nth-child(even) { background: #fafaf9; }
  tbody td { padding: 10px 12px; font-size: 12.5px; color: #292524; }
  td.sku { font-family: 'Courier New', monospace; font-size: 13px; font-weight: 700; color: #44403c; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.bold { font-weight: 700; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 28px; }
  .totals-box { width: 280px; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 4px; overflow: hidden; }
  .trow { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 12.5px; border-bottom: 1px solid #e7e5e4; }
  .trow span:first-child { color: #78716c; }
  .trow.grand { background: #ea580c; border: none; }
  .trow.grand span { color: white; font-weight: 800; font-size: 15px; }
  .footer { background: #f5f5f4; border-top: 3px solid #ea580c; padding: 16px 48px; display: flex; justify-content: space-between; font-size: 11px; color: #78716c; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    <div class="logo-mark"><div class="logo-letters">CS</div></div>
    <div><div class="co-name">Crestline Supply</div><div class="co-tag">Industrial &amp; Commercial Procurement</div></div>
  </div>
  <div class="inv-right">
    <div class="word">Tax Invoice</div>
    <div class="num">${d.invoice_number}</div>
  </div>
</div>
<div class="body-wrap">
  <div class="meta">
    <div class="meta-box">
      <div class="lbl">Supplier</div>
      <p>${d.vendor.address}</p>
      <p>${d.vendor.email}</p>
      <p>${d.vendor.phone}</p>
    </div>
    <div class="meta-box">
      <div class="lbl">Remit To</div>
      <p>${d.bill_to.name}</p>
      <p>${d.bill_to.address}</p>
    </div>
    <div class="meta-box">
      <div class="lbl">Issue Date</div><p>${d.invoice_date}</p>
      <div class="lbl" style="margin-top:8px">Due Date</div><p>${d.due_date}</p>
      <div class="lbl" style="margin-top:8px">PO No.</div><p class="ref">${d.po_reference}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr><th>SKU</th><th>Item Description</th><th class="num">Units</th><th class="num">Unit Price</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals-wrap">
    <div class="totals-box">
      <div class="trow"><span>Subtotal</span><span>${d.currency_symbol}${d.subtotal.toFixed(2)}</span></div>
      <div class="trow"><span>Sales Tax (${(d.tax_rate * 100).toFixed(0)}%)</span><span>${d.currency_symbol}${d.tax_amount.toFixed(2)}</span></div>
      <div class="trow grand"><span>TOTAL ${d.currency}</span><span>${d.currency_symbol}${d.total.toFixed(2)}</span></div>
    </div>
  </div>
</div>
<div class="footer">
  <span>Crestline Supply Co. · Terms: Net 30 · Late fee: 1.5%/mo</span>
  <span>Questions? billing@crestlinesupply.com</span>
</div>
</body>
</html>`
}
