import puppeteer from 'puppeteer'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { faker } from '@faker-js/faker'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

import { runMigrations } from '@/lib/db/migrate'
import { insertPO, insertWmsReceipt, insertInvoice, getPOByNumber, getDb } from '@/lib/db/repo'
import { renderTemplate } from './templates/index'
import { applyVariant } from './post-process'
import type { InvoiceRenderData, TemplateKey } from './templates/index'
import type { PdfVariant } from '@/data/scenarios-static'

// Seed faker for reproducibility
faker.seed(20240101)

const SCENARIOS_PATH = path.join(process.cwd(), 'data', 'scenarios.json')
const INVOICES_OUT   = path.join(process.cwd(), 'public', 'invoices')
const THUMBS_OUT     = path.join(process.cwd(), 'public', 'thumbnails')

const VENDOR_META: Record<string, { address: string; email: string; phone: string }> = {
  'Apex Logistics':       { address: '1420 Harbor Blvd, Los Angeles CA 90021', email: 'ar@apexlogistics.com',        phone: '+1 213-555-0192' },
  'Apax Logistics Inc.':  { address: '1420 Harbor Blvd, Los Angeles CA 90021', email: 'accounts@apaxlogistics.com',  phone: '+1 213-555-0192' },
  'Northwind Components': { address: '88 Maple Ave, Portland OR 97201',        email: 'invoices@northwindco.com',    phone: '+1 503-555-0134' },
  'Acme Corporation':     { address: '300 Industrial Pkwy, Chicago IL 60607',  email: 'billing@acmecorp.com',        phone: '+1 312-555-0178' },
  'ACME Corp.':           { address: '300 Industrial Pkwy, Chicago IL 60607',  email: 'billing@acmecorp.com',        phone: '+1 312-555-0178' },
  'Crestline Supply':     { address: '77 Commerce Dr, Dallas TX 75201',        email: 'ap@crestlinesupply.com',      phone: '+1 214-555-0209' },
  'EuroTech GmbH':        { address: 'Musterstraße 42, 80331 München, DE',     email: 'rechnungen@eurotech.de',      phone: '+49 89 555 0182' },
  'Pinnacle Parts':       { address: '501 Tech Row, Austin TX 78701',          email: 'finance@pinnacleparts.com',   phone: '+1 512-555-0144' },
  'Ironstone Trading':    { address: '200 River St, Atlanta GA 30301',         email: 'billing@ironstonetrading.com',phone: '+1 404-555-0163' },
  'Meridian Supplies':    { address: '95 Grant Ave, San Jose CA 95101',        email: 'invoices@meridiansupply.com', phone: '+1 408-555-0121' },
}

const BUYER = {
  name: 'Accrual Corp — Accounts Payable',
  address: '350 Fifth Ave, New York NY 10118',
}

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }

const HANDWRITTEN_NOTES: Record<string, string> = {
  'scenario-06': '✍ Handwritten note on invoice: "5% loyalty discount applied — approved by Sales Mgr. J. Torres, 14/03"',
}

const TAX_OVERRIDES: Record<string, number> = {
  'scenario-09': 0.12, // Should be 0.08 — agent must catch the discrepancy
}

function calcTotals(lineItems: { qty: number; unit_price: number }[], taxRate: number) {
  const subtotal = lineItems.reduce((s, li) => s + li.qty * li.unit_price, 0)
  const taxAmount = subtotal * taxRate
  return { subtotal, taxAmount, total: subtotal + taxAmount }
}

function invoiceDate() {
  const d = new Date('2024-03-15')
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function dueDate() {
  const d = new Date('2024-04-14')
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

async function pngToPdf(pngBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const pngImage = await pdfDoc.embedPng(pngBuffer)
  const { width, height } = pngImage
  const page = pdfDoc.addPage([width, height])
  page.drawImage(pngImage, { x: 0, y: 0, width, height })
  return Buffer.from(await pdfDoc.save())
}

async function renderInvoicePdf(
  scenarioId: string,
  templateKey: TemplateKey,
  data: InvoiceRenderData,
  variant: PdfVariant,
): Promise<string> {
  const html = renderTemplate(templateKey, data)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 1.5 })
  await page.setContent(html, { waitUntil: 'load' })
  const pngBuffer = Buffer.from(await page.screenshot({ fullPage: true, type: 'png' }))
  await browser.close()

  const processed = await applyVariant(pngBuffer, variant)
  const pdfBuffer = await pngToPdf(processed)

  const outPath = path.join(INVOICES_OUT, `${scenarioId}.pdf`)
  fs.writeFileSync(outPath, pdfBuffer)

  // Thumbnail: 480px wide, crop the top ~28% of the page (shows header with logo + invoice number)
  const thumbBuffer = await sharp(processed)
    .resize({ width: 480 })
    .toBuffer()
  const meta = await sharp(thumbBuffer).metadata()
  const cropHeight = Math.round((meta.height ?? 280) * 0.28)
  const finalThumb = await sharp(thumbBuffer)
    .extract({ left: 0, top: 0, width: 480, height: Math.max(cropHeight, 160) })
    .jpeg({ quality: 88 })
    .toBuffer()
  fs.writeFileSync(path.join(THUMBS_OUT, `${scenarioId}.jpg`), finalThumb)

  console.log(`  ✓ ${scenarioId}.pdf + thumbnail (${variant})`)
  return `/invoices/${scenarioId}.pdf`
}

async function seed() {
  console.log('\n🌱 FastPay AI — Seed Script\n')

  // Ensure output directories exist
  fs.mkdirSync(INVOICES_OUT, { recursive: true })
  fs.mkdirSync(THUMBS_OUT, { recursive: true })

  // Run DB migrations
  console.log('▸ Running migrations…')
  runMigrations()

  // Clear existing data
  console.log('▸ Clearing existing data…')
  const db = getDb()
  db.exec(`
    DELETE FROM match_results;
    DELETE FROM invoices;
    DELETE FROM wms_receipts;
    DELETE FROM purchase_orders;
  `)

  // Load scenarios
  const scenarios = JSON.parse(fs.readFileSync(SCENARIOS_PATH, 'utf-8')) as Array<{
    id: string
    title: string
    difficulty: string
    skill_tag: string
    pdf_variant: PdfVariant
    vendor_template: TemplateKey
    ground_truth: { status: string; flag_reason: string | null }
    purchase_order: { po_number: string; vendor_name: string; currency: string; line_items: Array<{ sku: string; description: string; qty: number; unit_price: number }> }
    wms_receipt: { line_items: Array<{ sku: string; received_qty: number }> }
    invoice: { invoice_number: string; vendor_name: string; currency: string; line_items: Array<{ sku: string; description: string; qty: number; unit_price: number }> }
  }>

  console.log(`▸ Processing ${scenarios.length} scenarios…\n`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  await browser.close() // warm-up / verify chromium available

  for (const s of scenarios) {
    console.log(`[${s.id}] ${s.title}`)

    const poId = randomUUID()
    const wmsId = randomUUID()
    const invoiceId = randomUUID()
    const now = new Date().toISOString()

    // Insert PO — reuse existing if same po_number already seeded (e.g. scenario-07 duplicates scenario-01's PO)
    const existingPO = getPOByNumber(s.purchase_order.po_number)
    const resolvedPoId = existingPO ? existingPO.id : poId
    if (!existingPO) {
      insertPO({
        id: resolvedPoId,
        po_number: s.purchase_order.po_number,
        vendor_name: s.purchase_order.vendor_name,
        currency: s.purchase_order.currency,
        line_items: s.purchase_order.line_items,
        created_at: now,
      })
    }

    // Insert WMS receipt
    insertWmsReceipt({
      id: wmsId,
      po_id: resolvedPoId,
      received_at: now,
      line_items: s.wms_receipt.line_items,
    })

    // Build render data
    const vendorMeta = VENDOR_META[s.invoice.vendor_name] ?? VENDOR_META[s.purchase_order.vendor_name]!
    const taxRate = TAX_OVERRIDES[s.id] ?? 0.08
    const { subtotal, taxAmount, total } = calcTotals(s.invoice.line_items, taxRate)
    const currencySymbol = CURRENCY_SYMBOLS[s.invoice.currency] ?? '$'

    const renderData: InvoiceRenderData = {
      invoice_number: s.invoice.invoice_number,
      po_reference: s.purchase_order.po_number,
      invoice_date: invoiceDate(),
      due_date: dueDate(),
      vendor: { name: s.invoice.vendor_name, ...vendorMeta },
      bill_to: BUYER,
      line_items: s.invoice.line_items,
      currency: s.invoice.currency,
      currency_symbol: currencySymbol,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      notes: HANDWRITTEN_NOTES[s.id],
    }

    // Render PDF
    const pdfPath = await renderInvoicePdf(s.id, s.vendor_template, renderData, s.pdf_variant)

    // Insert invoice record
    insertInvoice({
      id: invoiceId,
      invoice_number: s.invoice.invoice_number,
      vendor_name: s.invoice.vendor_name,
      currency: s.invoice.currency,
      pdf_path: pdfPath,
      line_items: s.invoice.line_items,
      status: 'pending',
      scenario_id: s.id,
      created_at: now,
    })
  }

  console.log('\n✅ Seed complete.')
  console.log(`   ${scenarios.length} POs, ${scenarios.length} WMS receipts, ${scenarios.length} invoices`)
  console.log(`   PDFs saved to: public/invoices/\n`)
  process.exit(0)
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
})
