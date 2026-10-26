import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { SCHEMA } from './schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let dbInstance: Database.Database | null = null

export function initDb(customPath?: string): Database.Database {
  if (dbInstance) {
    if (!customPath) return dbInstance
    dbInstance.close()
    dbInstance = null
  }

  const dbPath = customPath || path.resolve(__dirname, '../../data/soiree.db')
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  db.exec(SCHEMA)

  statementCache.clear()
  dbInstance = db
  return db
}

function runMigrations(db: Database.Database) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='plans'").all()
  if (tables.length === 0) return

  const planCols = db.pragma('table_info(plans)') as Array<{ name: string }>
  const planColNames = new Set(planCols.map((c) => c.name))

  if (!planColNames.has('share_token')) {
    db.exec('ALTER TABLE plans ADD COLUMN share_token TEXT')
  }
  if (!planColNames.has('share_enabled')) {
    db.exec('ALTER TABLE plans ADD COLUMN share_enabled INTEGER NOT NULL DEFAULT 0')
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_share_token ON plans(share_token)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_plans_share_enabled ON plans(share_enabled)')
}

const statementCache = new Map<string, Database.Statement>()

/**
 * Returns a cached prepared statement to avoid re-compiling SQL per request.
 */
export function getStatement(sql: string): Database.Statement {
  let stmt = statementCache.get(sql)
  if (!stmt) {
    stmt = getDb().prepare(sql)
    statementCache.set(sql, stmt)
  }
  return stmt
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = initDb()
  }
  return dbInstance
}

export function closeDb() {
  if (dbInstance) {
    statementCache.clear()
    dbInstance.close()
    dbInstance = null
  }
}
