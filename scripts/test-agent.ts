import fs from 'fs'
import path from 'path'

// Load .env.local before any app modules are imported
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (key) process.env[key] = val
  }
}

// Dynamic imports — run after env is populated
async function main() {
  const { runMigrations } = await import('@/lib/db/migrate')
  const { getAllInvoices } = await import('@/lib/db/repo')
  const { runAgent } = await import('@/lib/agent/orchestrator')

  runMigrations()
  const invoices = await getAllInvoices()

  const scenarioId = process.argv[2] ?? 'scenario-01'
  const inv = invoices.find((i: { scenario_id: string | null }) => i.scenario_id === scenarioId)
  if (!inv) { console.error(`No invoice for ${scenarioId}`); process.exit(1) }

  console.log(`\n🤖 Testing ${scenarioId}: ${inv.invoice_number}\n`)

  const result = await runAgent(inv.id, e => {
    const icon = e.status === 'done' ? '✓' : e.status === 'error' ? '✗' : '▸'
    console.log(`  ${icon} ${e.label}${e.detail ? ' — ' + e.detail : ''}`)
  })

  console.log(`\nStatus:      ${result.status}`)
  console.log(`Flag:        ${result.flag_reason ?? 'none'}`)
  console.log(`Confidence:  ${Math.round(result.confidence * 100)}%`)
  console.log(`Duration:    ${result.durationMs}ms`)
  console.log(`\nExplanation:\n${result.explanation}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
