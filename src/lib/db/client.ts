import path from 'path'

// Returns true when DATABASE_URL points to a Postgres/Neon connection string
export function isPostgres(): boolean {
  const url = process.env.DATABASE_URL ?? ''
  return url.startsWith('postgres://') || url.startsWith('postgresql://')
}

// SQLite singleton — only used in local dev
let _sqlite: import('better-sqlite3').Database | null = null

export function getDb(): import('better-sqlite3').Database {
  if (_sqlite) return _sqlite

  // Avoid importing better-sqlite3 in production (it's a native module not
  // available in Vercel's runtime).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as typeof import('better-sqlite3')
  const fs       = require('fs')  as typeof import('fs')

  const dbPath = process.env.DATABASE_URL ?? path.join(process.cwd(), 'data', 'fastpay.db')
  const dir    = path.dirname(dbPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  _sqlite = new Database(dbPath)
  _sqlite.pragma('journal_mode = WAL')
  _sqlite.pragma('foreign_keys = ON')
  return _sqlite
}

// Neon client singleton — used in production (Vercel)
let _neon: ReturnType<typeof import('@neondatabase/serverless').neon> | null = null

export function getNeon() {
  if (_neon) return _neon
  const { neon } = require('@neondatabase/serverless') as typeof import('@neondatabase/serverless')
  _neon = neon(process.env.DATABASE_URL!)
  return _neon
}
