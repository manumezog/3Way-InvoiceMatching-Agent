import { NextResponse } from 'next/server'
import { clearMatchResults } from '@/lib/db/repo'
import { runMigrationsAsync } from '@/lib/db/migrate'

export const dynamic = 'force-dynamic'

export async function POST(): Promise<NextResponse> {
  await runMigrationsAsync()
  await clearMatchResults()
  return NextResponse.json({ ok: true })
}
