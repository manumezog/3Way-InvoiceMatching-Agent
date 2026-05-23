import fs from 'fs'
import path from 'path'
import { isPostgres, getDb, getNeon } from './client'

// SQLite DDL — run once per process (idempotent via IF NOT EXISTS)
let sqliteMigrated = false

export function runMigrations(): void {
  if (isPostgres()) return // Neon schema is applied via runMigrationsAsync()
  if (sqliteMigrated) return
  const db  = getDb()
  const sql = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql'), 'utf-8')
  db.exec(sql)
  sqliteMigrated = true
}

// Postgres DDL — called once at app startup on Vercel (or via npm run migrate)
let neonMigrated = false

export async function runMigrationsAsync(): Promise<void> {
  if (!isPostgres()) { runMigrations(); return }
  if (neonMigrated) return
  const sql  = getNeon()
  const ddl  = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'db', 'schema.pg.sql'), 'utf-8')
  // Split on semicolons and run each statement individually via sql.query()
  // (tagged template doesn't support multi-statement strings; sql.query() handles raw SQL)
  const stmts = ddl.split(';').map(s => s.trim()).filter(Boolean)
  for (const stmt of stmts) {
    await sql.query(stmt + ';')
  }
  neonMigrated = true
}
