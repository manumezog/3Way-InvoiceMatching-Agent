'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { PurchaseOrder, WmsReceipt, Invoice, MatchResult } from '@/lib/schemas/entities'

interface BrowseData {
  pos: PurchaseOrder[]
  wmsReceipts: WmsReceipt[]
  invoices: Invoice[]
  matchResults: MatchResult[]
}

function StatusBadge({ status }: { status: string }) {
  const colour =
    status === 'APPROVED' || status === 'approved' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
    status === 'FLAGGED'  || status === 'flagged'  ? 'bg-red-500/15 text-red-400 border-red-500/30' :
    status === 'ESCALATED'|| status === 'escalated'? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
    'bg-zinc-700/40 text-zinc-400 border-zinc-600'
  return <Badge className={`border text-[10px] font-medium uppercase ${colour}`}>{status}</Badge>
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500">{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-xs text-zinc-300 align-top ${className}`}>{children}</td>
}

// ERP-style header row (darker stripe) for PO / Invoice / WMS receipt
function HeaderRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-zinc-700 bg-zinc-800/60">{children}</tr>
}
// Indented line-item detail row
function DetailRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-zinc-800/40 hover:bg-zinc-800/20">{children}</tr>
}
function DetailTd({ children, className = '', colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`py-1.5 pl-8 pr-3 text-[11px] text-zinc-500 ${className}`}>{children}</td>
}

function POsTable({ pos }: { pos: PurchaseOrder[] }) {
  if (!pos.length) return <p className="p-4 text-sm text-zinc-500">No purchase orders yet.</p>
  // 8 columns: PO# | Vendor | Currency | Created | SKU | Description | Qty | Unit Price
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-zinc-800">
          <Th>PO #</Th><Th>Vendor</Th><Th>Currency</Th><Th>Created</Th>
          <Th>SKU</Th><Th>Description</Th><Th>Qty</Th><Th>Unit Price</Th>
        </tr>
      </thead>
      <tbody>
        {pos.map(po => (
          <>
            <HeaderRow key={`h-${po.id}`}>
              <Td><span className="font-mono text-zinc-200">{po.po_number}</span></Td>
              <Td>{po.vendor_name}</Td>
              <Td>{po.currency}</Td>
              <Td className="text-zinc-500">{po.created_at.slice(0, 10)}</Td>
              <td colSpan={4} className="px-3 py-2 text-[11px] text-zinc-500">{po.line_items.length} line item{po.line_items.length !== 1 ? 's' : ''}</td>
            </HeaderRow>
            {po.line_items.map((li, i) => (
              <DetailRow key={`${po.id}-${i}`}>
                <DetailTd colSpan={4} />
                <DetailTd><span className="font-mono text-zinc-400">{li.sku}</span></DetailTd>
                <DetailTd>{li.description}</DetailTd>
                <DetailTd>{li.qty}</DetailTd>
                <DetailTd>${li.unit_price.toFixed(2)}</DetailTd>
              </DetailRow>
            ))}
          </>
        ))}
      </tbody>
    </table>
  )
}

function WmsTable({ wmsReceipts, pos }: { wmsReceipts: WmsReceipt[]; pos: PurchaseOrder[] }) {
  const poMap = Object.fromEntries(pos.map(p => [p.id, p.po_number]))
  if (!wmsReceipts.length) return <p className="p-4 text-sm text-zinc-500">No WMS receipts yet.</p>
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-zinc-800">
          {['PO #', 'Received At'].map(h => <Th key={h}>{h}</Th>)}
          <Th>SKU</Th><Th>Received Qty</Th>
        </tr>
      </thead>
      <tbody>
        {wmsReceipts.map(r => (
          <>
            <HeaderRow key={`h-${r.id}`}>
              <Td><span className="font-mono text-zinc-200">{poMap[r.po_id] ?? r.po_id.slice(0, 8)}</span></Td>
              <Td className="text-zinc-500">{r.received_at.slice(0, 16).replace('T', ' ')}</Td>
              <td colSpan={2} className="px-3 py-2 text-[11px] text-zinc-500">{r.line_items.length} line item{r.line_items.length !== 1 ? 's' : ''}</td>
            </HeaderRow>
            {r.line_items.map((li, i) => (
              <DetailRow key={`${r.id}-${i}`}>
                <DetailTd colSpan={2} />
                <DetailTd><span className="font-mono text-zinc-400">{li.sku}</span></DetailTd>
                <DetailTd>{li.received_qty}</DetailTd>
              </DetailRow>
            ))}
          </>
        ))}
      </tbody>
    </table>
  )
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
      return new Set(
        inv.line_items
          .filter(li => poPrice[li.sku] !== undefined && Math.abs(li.unit_price - poPrice[li.sku]) / poPrice[li.sku] > 0.01)
          .map(li => li.sku)
      )
    }
    case 'SHORTAGE': {
      if (!wms) return new Set()
      const rcvd = Object.fromEntries(wms.line_items.map(li => [li.sku, li.received_qty]))
      return new Set(
        inv.line_items
          .filter(li => rcvd[li.sku] !== undefined && li.qty > rcvd[li.sku])
          .map(li => li.sku)
      )
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

function InvoicesTable({ invoices, matchResults, pos, wmsReceipts }: {
  invoices: Invoice[]
  matchResults: MatchResult[]
  pos: PurchaseOrder[]
  wmsReceipts: WmsReceipt[]
}) {
  const matchMap = Object.fromEntries(matchResults.map(m => [m.invoice_id, m]))
  if (!invoices.length) return <p className="p-4 text-sm text-zinc-500">No invoices yet.</p>
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-zinc-800">
          {['Invoice #', 'Vendor', 'Currency'].map(h => <Th key={h}>{h}</Th>)}
          <Th>Agent Decision</Th>
          <Th>Flag Reason</Th>
          <Th>Confidence</Th>
          <Th>Processed At</Th>
          <Th>SKU</Th><Th>Description</Th><Th>Qty</Th><Th>Unit Price</Th>
        </tr>
      </thead>
      <tbody>
        {invoices.map(inv => {
          const match = matchMap[inv.id]
          const impacted = match && match.status !== 'APPROVED' ? findImpactedSkus(inv, match, pos, wmsReceipts) : new Set<string>()
          return (
            <>
              <HeaderRow key={`h-${inv.id}`}>
                <Td><span className="font-mono text-zinc-200">{inv.invoice_number}</span></Td>
                <Td>{inv.vendor_name}</Td>
                <Td>{inv.currency}</Td>
                <Td>{match ? <StatusBadge status={match.status} /> : <StatusBadge status="pending" />}</Td>
                <Td>{match?.flag_reason ? <span className="text-xs text-zinc-400">{match.flag_reason}</span> : <span className="text-zinc-600">—</span>}</Td>
                <Td>{match ? <span className="text-zinc-300">{Math.round(match.confidence * 100)}%</span> : <span className="text-zinc-600">—</span>}</Td>
                <Td className="text-zinc-500">{match ? match.matched_at.slice(0, 16).replace('T', ' ') : '—'}</Td>
                <td colSpan={4} className="px-3 py-2 text-[11px] text-zinc-500">{inv.line_items.length} line item{inv.line_items.length !== 1 ? 's' : ''}</td>
              </HeaderRow>
              {inv.line_items.map((li, i) => {
                const isImpacted = impacted.has(li.sku)
                return isImpacted ? (
                  <tr key={`${inv.id}-${i}`} className="border-b border-red-900/40 bg-red-950/20">
                    <DetailTd colSpan={7} />
                    <DetailTd>
                      <span className="font-mono text-zinc-400">{li.sku}</span>
                      <span className="ml-1 text-red-400 text-[9px] font-bold">⚠</span>
                    </DetailTd>
                    <DetailTd>{li.description}</DetailTd>
                    <DetailTd>{li.qty}</DetailTd>
                    <DetailTd>${li.unit_price.toFixed(2)}</DetailTd>
                  </tr>
                ) : (
                  <DetailRow key={`${inv.id}-${i}`}>
                    <DetailTd colSpan={7} />
                    <DetailTd><span className="font-mono text-zinc-400">{li.sku}</span></DetailTd>
                    <DetailTd>{li.description}</DetailTd>
                    <DetailTd>{li.qty}</DetailTd>
                    <DetailTd>${li.unit_price.toFixed(2)}</DetailTd>
                  </DetailRow>
                )
              })}
            </>
          )
        })}
      </tbody>
    </table>
  )
}

export function DatabaseExplorer() {
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

  if (loading) return <p className="p-6 text-sm text-zinc-500">Loading database…</p>
  if (error)   return <p className="p-6 text-sm text-red-400">Error: {error}</p>
  if (!data)   return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-zinc-300">Database Explorer</h2>
        <div className="flex gap-3 text-xs text-zinc-500">
          <span>{data.pos.length} POs</span>
          <span>{data.wmsReceipts.length} WMS receipts</span>
          <span>{data.invoices.length} invoices</span>
          <span>{data.matchResults.length} match results</span>
        </div>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="border border-zinc-800 bg-zinc-900">
          {['invoices','purchase_orders','wms_receipts'].map(v => (
            <TabsTrigger
              key={v}
              value={v}
              className="text-zinc-500 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
            >
              {v === 'invoices' ? 'Invoices + Results' : v === 'purchase_orders' ? 'Purchase Orders' : 'WMS Receipts'}
            </TabsTrigger>
          ))}
        </TabsList>

        <Card className="mt-3 border-zinc-800 bg-zinc-900/50 p-0 overflow-hidden">
          <TabsContent value="invoices" className="mt-0">
            <ScrollArea className="h-[500px]">
              <InvoicesTable invoices={data.invoices} matchResults={data.matchResults} pos={data.pos} wmsReceipts={data.wmsReceipts} />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="purchase_orders" className="mt-0">
            <ScrollArea className="h-[500px]">
              <POsTable pos={data.pos} />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="wms_receipts" className="mt-0">
            <ScrollArea className="h-[500px]">
              <WmsTable wmsReceipts={data.wmsReceipts} pos={data.pos} />
            </ScrollArea>
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  )
}
