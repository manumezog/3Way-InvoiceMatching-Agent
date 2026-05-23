'use client'

import { Zap, Info } from 'lucide-react'

interface NavbarProps {
  onHowItWorks?: () => void
}

export function Navbar({ onHowItWorks }: NavbarProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="mx-auto flex max-w-screen-xl items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
            <Zap className="h-4 w-4 text-zinc-950" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none text-white">FastPay AI</h1>
            <p className="mt-0.5 text-xs leading-none text-zinc-500">
              Autonomous 3-Way Invoice Reconciliation
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {onHowItWorks && (
            <button
              onClick={onHowItWorks}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Info className="h-3.5 w-3.5" />
              How it works
            </button>
          )}
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            Agent Ready
          </span>
        </div>
      </div>
    </header>
  )
}
