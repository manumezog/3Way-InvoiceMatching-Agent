'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Download } from 'lucide-react'
import type { PurchaseOrder, WmsReceipt, Invoice, MatchResult } from '@/lib/schemas/entities'

interface BrowseData {
  pos: PurchaseOrder[]
  wmsReceipts: WmsReceipt[]
  invoices: Invoice[]
  matchResults: MatchResult[]
}

function StatusBadge({ status }: { status: string }) {
  const colour =
    status === 'FLAGGED'   ? 'bg-red-500/15 text-red-400 border-red-500/30' :
    status === 'ESCALATED' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
    'bg-zinc-700/40 text-zinc-400 border-zinc-600'
  return <Badge className={`border text-[10px] font-semibold uppercase ${colour}`}>{status}</Badge>
}

function findImpactedSkus(
  inv: Invoice,
  match: MatchResult,
  pos: PurchaseOrder[],
  wmsReceipts: WmsReceipt[],
): Set<string> {
  const po  = pos.find(p => p.id === match.po_id)
  const wms = wmsReceipts.find(w => w.id === match.wms_id)
  switch (match.flag_reason) {
    case 'PRICE_MISMATCH': {
      if (!po) return new Set()
      const poPrice = Object.fromEntries(po.line_items.map(li => [li.sku, li.unit_price]))
      return new Set(inv.line_items.filter(li => poPrice[li.sku] !== undefined && Math.abs(li.unit_price - poPrice[li.sku]) / poPrice[li.sku] > 0.01).map(li => li.sku))
    }
    case 'SHORTAGE': {
      if (!wms) return new Set()
      const rcvd = Object.fromEntries(wms.line_items.map(li => [li.sku, li.received_qty]))
      return new Set(inv.line_items.filter(li => rcvd[li.sku] !== undefined && li.qty > rcvd[li.sku]).map(li => li.sku))
    }
    case 'UNAUTHORIZED_ITEMS': {
      if (!po) return new Set()
      const poSkus = new Set(po.line_items.map(li => li.sku))
      return new Set(inv.line_items.filter(li => !poSkus.has(li.sku)).map(li => li.sku))
    }
    default:
      return new Set()
  }
}

function LineItemsDetail({ inv, match, pos, wmsReceipts }: {
  inv: Invoice
  match: MatchResult
  pos: PurchaseOrder[]
  wmsReceipts: WmsReceipt[]
}) {
  const impacted = findImpactedSkus(inv, match, pos, wmsReceipts)
  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="px-3 py-1.5 text-left font-medium text-zinc-500">SKU</th>
            <th className="px-3 py-1.5 text-left font-medium text-zinc-500">Description</th>
            <th className="px-3 py-1.5 text-right font-medium text-zinc-500">Qty</th>
            <th className="px-3 py-1.5 text-right font-medium text-zinc-500">Unit Price</th>
          </tr>
        </thead>
        <tbody>
          {inv.line_items.map((li, i) => {
            const isHit = impacted.has(li.sku)
            return (
              <tr key={i} className={isHit ? 'bg-red-950/30 border-b border-red-900/30' : 'border-b border-zinc-800/50'}>
                <td className="px-3 py-1.5 font-mono">
                  <span className={isHit ? 'text-red-300' : 'text-zinc-400'}>{li.sku}</span>
                  {isHit && <span className="ml-1.5 rounded bg-red-500/20 px-1 py-0.5 text-[9px] font-bold text-red-400">⚠ impacted</span>}
                </td>
                <td className={`px-3 py-1.5 ${isHit ? 'text-zinc-300' : 'text-zinc-500'}`}>{li.description}</td>
                <td className={`px-3 py-1.5 text-right ${isHit ? 'text-zinc-300' : 'text-zinc-500'}`}>{li.qty}</td>
                <td className={`px-3 py-1.5 text-right font-mono ${isHit ? 'text-red-300' : 'text-zinc-500'}`}>${li.unit_price.toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function EscalationsDashboard() {
  const [data, setData] = useState<BrowseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/db/browse')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="p-6 text-sm text-zinc-500">Loading escalations…</p>
  if (error)   return <p className="p-6 text-sm text-red-400">Error: {error}</p>
  if (!data)   return null

  const matchMap = Object.fromEntries(data.matchResults.map(m => [m.invoice_id, m]))
  const flagged = data.invoices
    .map(inv => ({ inv, match: matchMap[inv.id] }))
    .filter(({ match }) => match && (match.status === 'FLAGGED' || match.status === 'ESCALATED'))

  if (!flagged.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center">
        <FileText className="mx-auto mb-3 h-9 w-9 text-zinc-600" />
        <p className="text-sm text-zinc-400">No escalations yet. Run the agent on some invoices first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-zinc-300">Escalations</h2>
        <span className="text-xs text-zinc-500">{flagged.length} invoice{flagged.length !== 1 ? 's' : ''} requiring review</span>
      </div>

      <ScrollArea className="h-[600px] pr-1">
        <div className="space-y-4">
          {flagged.map(({ inv, match }) => (
            <div key={inv.id} className={`rounded-xl border p-4 ${match.status === 'FLAGGED' ? 'border-red-900/40 bg-red-950/10' : 'border-amber-900/40 bg-amber-950/10'}`}>
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <StatusBadge status={match.status} />
                  <span className="font-mono text-sm font-semibold text-zinc-100">{inv.invoice_number}</span>
                  <span className="text-xs text-zinc-500">{inv.vendor_name}</span>
                  <span className="text-[10px] text-zinc-600">{inv.currency}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-zinc-400">{Math.round(match.confidence * 100)}% confidence</span>
                  <span className="text-[10px] text-zinc-500">{match.matched_at.slice(0, 16).replace('T', ' ')}</span>
                  {inv.scenario_id && !inv.scenario_id.startsWith('byoi-') && (
                    <a
                      href={`/invoices/${inv.scenario_id}.pdf`}
                      download
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </a>
                  )}
                </div>
              </div>

              {/* Flag reason */}
              {match.flag_reason && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Flag Reason</span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${match.status === 'FLAGGED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {match.flag_reason.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              {/* Agent explanation */}
              <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">{match.explanation}</p>

              {/* Line items with impacted SKU highlighting */}
              <LineItemsDetail inv={inv} match={match} pos={data.pos} wmsReceipts={data.wmsReceipts} />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
