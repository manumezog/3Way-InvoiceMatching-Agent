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

function LineItemsCell({ items }: { items: Array<{ sku: string; description?: string; qty?: number; unit_price?: number; received_qty?: number }> }) {
  return (
    <div className="space-y-0.5">
      {items.map((li, i) => (
        <div key={i} className="flex gap-2 text-[11px]">
          <span className="font-mono text-zinc-400">{li.sku}</span>
          <span className="text-zinc-500">{li.description ?? '—'}</span>
          {'qty' in li && <span className="text-zinc-500">×{li.qty} @ ${li.unit_price}</span>}
          {'received_qty' in li && <span className="text-zinc-500">rcvd: {li.received_qty}</span>}
        </div>
      ))}
    </div>
  )
}

function POsTable({ pos }: { pos: PurchaseOrder[] }) {
  if (!pos.length) return <p className="p-4 text-sm text-zinc-500">No purchase orders yet.</p>
  return (
    <table className="w-full">
      <thead><tr className="border-b border-zinc-800">{['PO #','Vendor','Currency','Line Items','Created'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
      <tbody>
        {pos.map(po => (
          <tr key={po.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
            <Td><span className="font-mono text-zinc-200">{po.po_number}</span></Td>
            <Td>{po.vendor_name}</Td>
            <Td>{po.currency}</Td>
            <Td><LineItemsCell items={po.line_items} /></Td>
            <Td className="text-zinc-500">{po.created_at.slice(0, 10)}</Td>
          </tr>
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
      <thead><tr className="border-b border-zinc-800">{['PO #','Received At','Line Items'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
      <tbody>
        {wmsReceipts.map(r => (
          <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
            <Td><span className="font-mono text-zinc-200">{poMap[r.po_id] ?? r.po_id.slice(0, 8)}</span></Td>
            <Td className="text-zinc-500">{r.received_at.slice(0, 16).replace('T', ' ')}</Td>
            <Td><LineItemsCell items={r.line_items} /></Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function InvoicesTable({ invoices, matchResults }: { invoices: Invoice[]; matchResults: MatchResult[] }) {
  const matchMap = Object.fromEntries(matchResults.map(m => [m.invoice_id, m]))
  if (!invoices.length) return <p className="p-4 text-sm text-zinc-500">No invoices yet.</p>
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-zinc-800">
          {['Invoice #','Vendor','Currency','Line Items','Status','Match Result','Confidence','Matched At'].map(h => <Th key={h}>{h}</Th>)}
        </tr>
      </thead>
      <tbody>
        {invoices.map(inv => {
          const match = matchMap[inv.id]
          return (
            <tr key={inv.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <Td><span className="font-mono text-zinc-200">{inv.invoice_number}</span></Td>
              <Td>{inv.vendor_name}</Td>
              <Td>{inv.currency}</Td>
              <Td><LineItemsCell items={inv.line_items} /></Td>
              <Td><StatusBadge status={inv.status} /></Td>
              <Td>{match ? <StatusBadge status={match.status} /> : <span className="text-zinc-600">—</span>}</Td>
              <Td>{match ? <span className="text-zinc-400">{Math.round(match.confidence * 100)}%</span> : '—'}</Td>
              <Td className="text-zinc-500">{match ? match.matched_at.slice(0, 16).replace('T', ' ') : '—'}</Td>
            </tr>
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
              <InvoicesTable invoices={data.invoices} matchResults={data.matchResults} />
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
