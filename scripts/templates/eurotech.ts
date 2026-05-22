import type { InvoiceRenderData } from './types'

export function eurotechTemplate(d: InvoiceRenderData): string {
  const rows = d.line_items.map(li => `
    <tr>
      <td class="sku">${li.sku}</td>
      <td>${li.description}</td>
      <td class="num">${li.qty}</td>
      <td class="num">${d.currency_symbol}${li.unit_price.toFixed(2)}</td>
      <td class="num">${d.currency_symbol}${(li.qty * li.unit_price).toFixed(2)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; color: #1a1a1a; background: #fff; padding: 40px 48px; width: 900px; }
  .top-bar { background: #dc2626; height: 6px; margin: -40px -48px 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin: 28px 0 32px; }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-mark { width: 50px; height: 50px; border: 2px solid #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .logo-text { font-size: 16px; font-weight: 900; color: #dc2626; letter-spacing: -1px; }
  .company-block .name { font-size: 18px; font-weight: 700; color: #1a1a1a; }
  .company-block .sub { font-size: 10px; color: #6b7280; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 3px; }
  .invoice-block { text-align: right; }
  .invoice-block .word { font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #dc2626; }
  .invoice-block .num { font-size: 20px; font-weight: 800; color: #1a1a1a; margin-top: 4px; }
  .double-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 28px; }
  .addr-block { border-left: 3px solid #dc2626; padding-left: 12px; }
  .addr-block .label { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #dc2626; margin-bottom: 6px; }
  .addr-block p { font-size: 12px; line-height: 1.65; color: #374151; }
  .dates-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 28px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 12px 16px; }
  .dates-grid .d-label { font-size: 10px; color: #dc2626; font-weight: 600; }
  .dates-grid .d-value { font-size: 12.5px; color: #1a1a1a; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead { border-bottom: 2px solid #dc2626; }
  thead th { padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #dc2626; text-align: left; }
  thead th.num { text-align: right; }
  tbody td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
  tbody tr:nth-child(even) td { background: #fef9f9; }
  td.sku { font-family: 'Courier New', monospace; font-size: 10.5px; color: #9ca3af; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
  .totals-inner { width: 270px; }
  .trow { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; color: #4b5563; border-bottom: 1px solid #f3f4f6; }
  .trow.total { border-top: 2px solid #dc2626; border-bottom: none; font-weight: 800; font-size: 15px; color: #dc2626; padding-top: 10px; }
  .mwst-note { font-size: 10px; color: #9ca3af; text-align: right; margin-top: 4px; }
  .footer { border-top: 1px solid #e5e7eb; padding-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .footer p { font-size: 10.5px; color: #9ca3af; line-height: 1.7; }
  .footer .bank { color: #374151; font-size: 10.5px; }
</style>
</head>
<body>
<div class="top-bar"></div>
<div class="header">
  <div class="logo-area">
    <div class="logo-mark"><div class="logo-text">ET</div></div>
    <div class="company-block">
      <div class="name">EuroTech GmbH</div>
      <div class="sub">Enterprise Technology Solutions</div>
    </div>
  </div>
  <div class="invoice-block">
    <div class="word">Rechnung / Invoice</div>
    <div class="num">${d.invoice_number}</div>
  </div>
</div>
<div class="double-col">
  <div class="addr-block">
    <div class="label">Lieferant / Vendor</div>
    <p>${d.vendor.address}<br/>${d.vendor.email}<br/>${d.vendor.phone}</p>
  </div>
  <div class="addr-block">
    <div class="label">Rechnungsempfänger / Bill To</div>
    <p>${d.bill_to.name}<br/>${d.bill_to.address}</p>
  </div>
</div>
<div class="dates-grid">
  <div><div class="d-label">Invoice Date</div><div class="d-value">${d.invoice_date}</div></div>
  <div><div class="d-label">Due Date</div><div class="d-value">${d.due_date}</div></div>
  <div><div class="d-label">PO Reference</div><div class="d-value">${d.po_reference}</div></div>
  <div><div class="d-label">Currency</div><div class="d-value">${d.currency} (€)</div></div>
</div>
<table>
  <thead>
    <tr><th>Art.-Nr.</th><th>Beschreibung / Description</th><th class="num">Menge / Qty</th><th class="num">Einzelpreis</th><th class="num">Betrag / Amount</th></tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="totals">
  <div class="totals-inner">
    <div class="trow"><span>Nettobetrag / Subtotal</span><span>${d.currency_symbol}${d.subtotal.toFixed(2)}</span></div>
    <div class="trow"><span>MwSt. ${(d.tax_rate * 100).toFixed(0)}%</span><span>${d.currency_symbol}${d.tax_amount.toFixed(2)}</span></div>
    <div class="trow total"><span>Gesamtbetrag / Total ${d.currency}</span><span>${d.currency_symbol}${d.total.toFixed(2)}</span></div>
  </div>
</div>
<div class="mwst-note">* Prices in ${d.currency}. Exchange rate risk borne by buyer per contract clause 8.3.</div>
<div class="footer">
  <p>EuroTech GmbH · Musterstraße 42 · 80331 München · Deutschland<br/>Steuernummer: DE297834120 · HRB 229847</p>
  <p class="bank">Bankverbindung: Deutsche Bank AG<br/>IBAN: DE89 3704 0044 0532 0130 00 · BIC: COBADEFFXXX</p>
</div>
</body>
</html>`
}
