import { getFlashModel } from '@/lib/agent/gemini'
import type { ExtractedInvoice } from './extract-pdf'
import type { PurchaseOrder, WmsReceipt } from '@/lib/schemas/entities'
import type { VendorMatchResult } from './fuzzy-match-vendor'
import type { FxResult } from './convert-currency'
import type { MatchStatus, FlagReason } from '@/lib/schemas/entities'

export interface ReasoningInput {
  extracted: ExtractedInvoice
  po: PurchaseOrder
  wms: WmsReceipt
  vendorMatch: VendorMatchResult
  fxResult?: FxResult
}

export interface DecisionOutput {
  status: MatchStatus
  flag_reason: FlagReason
  confidence: number
  explanation: string
}

interface RuleResult {
  status: MatchStatus
  flag_reason: FlagReason
  confidence: number
  issues: string[]
}

const PRICE_TOLERANCE = 0.001  // <0.1% rounding tolerance
const QTY_TOLERANCE   = 0      // zero tolerance on quantity

function applyRules(input: ReasoningInput): RuleResult {
  const { extracted, po, wms, vendorMatch, fxResult } = input
  const issues: string[] = []

  // 1. Duplicate handled upstream — not checked here

  // 2. Vendor match
  if (vendorMatch.isSuspicious && !vendorMatch.isMatch) {
    return { status: 'FLAGGED', flag_reason: 'VENDOR_MISMATCH', confidence: vendorMatch.confidence, issues: [vendorMatch.detail] }
  }
  if (vendorMatch.isSuspicious && vendorMatch.isMatch) {
    // Near-duplicate vendor — escalate
    return { status: 'ESCALATED', flag_reason: 'VENDOR_MISMATCH', confidence: vendorMatch.confidence, issues: [vendorMatch.detail] }
  }

  // 3. Currency / FX
  if (extracted.currency !== po.currency) {
    if (!fxResult) {
      return { status: 'FLAGGED', flag_reason: 'FX_CONVERSION', confidence: 0.70, issues: [`Invoice currency ${extracted.currency} differs from PO currency ${po.currency} — FX conversion required`] }
    }
    issues.push(`Currency conversion applied: 1 ${fxResult.fromCurrency} = ${fxResult.rate} ${fxResult.toCurrency} (source: ${fxResult.source})`)
  }

  // 4. Build lookup maps
  const poItemMap = new Map(po.line_items.map(li => [li.sku, li]))
  const wmsItemMap = new Map(wms.line_items.map(li => [li.sku, li]))

  // 5. Check for unauthorized line items (SKUs in invoice not in PO)
  const unauthorizedSkus = extracted.line_items.filter(li => !poItemMap.has(li.sku))
  if (unauthorizedSkus.length > 0) {
    const skuList = unauthorizedSkus.map(li => `${li.sku} (${li.qty} × ${li.unit_price})`).join(', ')
    return { status: 'FLAGGED', flag_reason: 'UNAUTHORIZED_ITEMS', confidence: 0.96, issues: [`Unauthorized line items not in PO: ${skuList}`] }
  }

  // 6. Per-SKU: quantity and price checks
  for (const invItem of extracted.line_items) {
    const poItem = poItemMap.get(invItem.sku)
    const wmsItem = wmsItemMap.get(invItem.sku)

    if (!poItem) continue // already caught above

    // Quantity: invoice billed vs WMS received
    const receivedQty = wmsItem?.received_qty ?? 0
    if (invItem.qty - receivedQty > QTY_TOLERANCE) {
      issues.push(`SKU ${invItem.sku}: invoiced ${invItem.qty} units but WMS only received ${receivedQty} (shortage of ${invItem.qty - receivedQty})`)
      return { status: 'FLAGGED', flag_reason: 'SHORTAGE', confidence: 0.95, issues }
    }

    // Price: invoice unit price vs PO unit price (apply FX if needed)
    let invPrice = invItem.unit_price
    if (fxResult && extracted.currency !== po.currency) {
      invPrice = invItem.unit_price * fxResult.rate
    }

    if (invPrice - poItem.unit_price > poItem.unit_price * PRICE_TOLERANCE) {
      const sym = extracted.currency === 'EUR' ? '€' : extracted.currency === 'GBP' ? '£' : '$'
      issues.push(`SKU ${invItem.sku}: invoiced at ${sym}${invItem.unit_price} but PO price is $${poItem.unit_price} (${((invPrice / poItem.unit_price - 1) * 100).toFixed(1)}% above PO)`)
      return { status: 'FLAGGED', flag_reason: 'PRICE_MISMATCH', confidence: 0.97, issues }
    }
  }

  // 7. Low vendor confidence → escalate even if numbers match
  if (vendorMatch.confidence < 0.80) {
    return { status: 'ESCALATED', flag_reason: 'LOW_CONFIDENCE', confidence: vendorMatch.confidence, issues: [vendorMatch.detail] }
  }

  // 8. All checks passed
  return { status: 'APPROVED', flag_reason: null, confidence: 0.97, issues }
}

async function generateExplanation(input: ReasoningInput, rule: RuleResult): Promise<string> {
  const { extracted, po, wms } = input
  const poTotal = po.line_items.reduce((s, li) => s + li.qty * li.unit_price, 0)
  const wmsTotal = wms.line_items.reduce((s, li) => s + li.received_qty, 0)
  const invTotal = extracted.line_items.reduce((s, li) => s + li.qty, 0)

  const prompt = `You are an AP reconciliation agent. Write a concise 2-3 sentence explanation of the following invoice decision.
Be specific with numbers. Do not start with "I" or "The agent". Use third-person factual tone.

Decision: ${rule.status}${rule.flag_reason ? ` — ${rule.flag_reason.replace(/_/g, ' ')}` : ''}
Invoice: ${extracted.invoice_number} from "${extracted.vendor_name}"
PO vendor: "${po.vendor_name}", PO total units: ${poTotal}
WMS received total units: ${wmsTotal}
Invoice total units billed: ${invTotal}
Invoice currency: ${extracted.currency}
Issues found: ${rule.issues.length > 0 ? rule.issues.join('; ') : 'None — all quantities, prices, and vendor match.'}

Write the explanation now:`

  const model = getFlashModel()
  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

export async function reasonAndDecide(input: ReasoningInput): Promise<DecisionOutput> {
  const rule = applyRules(input)
  const explanation = await generateExplanation(input, rule)

  return {
    status: rule.status,
    flag_reason: rule.flag_reason,
    confidence: rule.confidence,
    explanation,
  }
}
