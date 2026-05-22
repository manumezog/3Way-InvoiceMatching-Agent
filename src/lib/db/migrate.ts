import fs from 'fs'
import path from 'path'
import { getDb } from './client'

export function runMigrations(): void {
  const db = getDb()
  const sql = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql'), 'utf-8')
  db.exec(sql)
}
