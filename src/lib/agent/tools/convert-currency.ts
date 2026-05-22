import { getDb } from '@/lib/db/client'

export interface FxResult {
  fromCurrency: string
  toCurrency: string
  rate: number
  convertedAmount: number
  source: 'cache' | 'api' | 'fallback'
}

// Fallback rates — updated periodically; real API integrated in Phase 8+
const FALLBACK_RATES: Record<string, number> = {
  'EUR_USD': 1.08,
  'GBP_USD': 1.27,
  'CAD_USD': 0.73,
  'JPY_USD': 0.0067,
  'USD_EUR': 0.926,
  'USD_GBP': 0.787,
}

function rateKey(from: string, to: string) { return `${from}_${to}` }

function ensureFxTable() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS fx_cache (
      pair       TEXT PRIMARY KEY,
      rate       REAL NOT NULL,
      fetched_at TEXT NOT NULL
    )
  `)
}

function getCachedRate(from: string, to: string): number | null {
  ensureFxTable()
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6h TTL
  const row = getDb()
    .prepare('SELECT rate FROM fx_cache WHERE pair = ? AND fetched_at > ?')
    .get(rateKey(from, to), cutoff) as { rate: number } | undefined
  return row?.rate ?? null
}

function cacheRate(from: string, to: string, rate: number) {
  ensureFxTable()
  getDb()
    .prepare('INSERT OR REPLACE INTO fx_cache (pair, rate, fetched_at) VALUES (?, ?, ?)')
    .run(rateKey(from, to), rate, new Date().toISOString())
}

export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
): Promise<FxResult> {
  if (from === to) {
    return { fromCurrency: from, toCurrency: to, rate: 1, convertedAmount: amount, source: 'cache' }
  }

  // Try DB cache first
  const cached = getCachedRate(from, to)
  if (cached) {
    return { fromCurrency: from, toCurrency: to, rate: cached, convertedAmount: +(amount * cached).toFixed(4), source: 'cache' }
  }

  // Try free FX API (no key required)
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, { signal: AbortSignal.timeout(4000) })
    if (res.ok) {
      const data = await res.json() as { rates: Record<string, number> }
      const rate = data.rates[to]
      if (rate) {
        cacheRate(from, to, rate)
        return { fromCurrency: from, toCurrency: to, rate, convertedAmount: +(amount * rate).toFixed(4), source: 'api' }
      }
    }
  } catch {
    // fall through to hardcoded fallback
  }

  // Fallback to hardcoded rates
  const fallback = FALLBACK_RATES[rateKey(from, to)]
  if (fallback) {
    return { fromCurrency: from, toCurrency: to, rate: fallback, convertedAmount: +(amount * fallback).toFixed(4), source: 'fallback' }
  }

  throw new Error(`No FX rate available for ${from} → ${to}`)
}
