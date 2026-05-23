import path from 'path'
import fs from 'fs'
import { neon } from '@neondatabase/serverless'

export function isPostgres(): boolean {
  const url = process.env.DATABASE_URL ?? ''
  return url.startsWith('postgres://') || url.startsWith('postgresql://')
}

// SQLite singleton — local dev only
let _sqlite: import('better-sqlite3').Database | null = null

export function getDb(): import('better-sqlite3').Database {
  if (_sqlite) return _sqlite

  // better-sqlite3 is a native Node module unavailable in Vercel's runtime.
  // Dynamic require keeps it out of the production bundle entirely.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as typeof import('better-sqlite3')

  const dbPath = process.env.DATABASE_URL ?? path.join(process.cwd(), 'data', 'fastpay.db')
  const dir    = path.dirname(dbPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  _sqlite = new Database(dbPath)
  _sqlite.pragma('journal_mode = WAL')
  _sqlite.pragma('foreign_keys = ON')
  return _sqlite
}

// Neon client singleton — production (Vercel)
let _neon: ReturnType<typeof neon> | null = null

export function getNeon(): ReturnType<typeof neon> {
  if (!_neon) _neon = neon(process.env.DATABASE_URL!)
  return _neon
}
