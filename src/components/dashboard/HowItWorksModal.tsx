'use client'

import { motion } from 'framer-motion'
import { X, FileText, Search, GitMerge, ShieldCheck, Zap } from 'lucide-react'

interface HowItWorksModalProps {
  onClose: () => void
}

const STEPS = [
  {
    icon: FileText,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    title: 'Extract Invoice',
    desc: 'Gemini Vision OCR reads the invoice PDF — including scanned, handwritten, or crumpled documents — and outputs structured line items with vendor, currency, and totals.',
  },
  {
    icon: Search,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    title: 'Fetch PO & WMS',
    desc: 'Two DB tool calls retrieve the matching Purchase Order and Warehouse Management System receipt for that vendor and PO number.',
  },
  {
    icon: GitMerge,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    title: '3-Way Match',
    desc: 'The agent compares invoice → PO → WMS receipt line by line: quantities, unit prices, and totals. Discrepancies beyond a ±2 % tolerance are flagged with an exact reason.',
  },
  {
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    title: 'Decide & Explain',
    desc: 'A final reasoning step emits APPROVED, FLAGGED, or ESCALATED with a confidence score and a plain-English explanation — fully auditable via the Langfuse trace link.',
  },
]

export function HowItWorksModal({ onClose }: HowItWorksModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
            <Zap className="h-4 w-4 text-zinc-950" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">How it works</h2>
            <p className="text-xs text-zinc-500">FastPay AI — Autonomous 3-Way Invoice Matching</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            FastPay AI is an agentic AI system that replaces manual AP invoice review.
            A Gemini 2.5 Flash agent autonomously reads invoices and cross-checks them
            against your Purchase Orders and WMS receipts — catching discrepancies a
            human reviewer might miss in seconds, not hours.
          </p>

          {/* Step grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.2 }}
                  className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${step.bg}`}>
                    <Icon className={`h-4 w-4 ${step.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-zinc-500">0{i + 1}</span>
                      <p className="text-xs font-semibold text-zinc-200">{step.title}</p>
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-500">{step.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Tech stack footer */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">Stack</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Next.js 14', 'TypeScript', 'Gemini 2.5 Flash',
                'Langfuse', 'Neon Postgres', 'Upstash Redis',
                'Tailwind CSS', 'Framer Motion',
              ].map(tag => (
                <span
                  key={tag}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
