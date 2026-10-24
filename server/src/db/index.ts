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
  db.exec(SCHEMA)
  runMigrations(db)

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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans(created_at);
    CREATE INDEX IF NOT EXISTS idx_plans_share_enabled ON plans(share_enabled);
    CREATE INDEX IF NOT EXISTS idx_budget_plan ON budget_items(plan_id);
    CREATE INDEX IF NOT EXISTS idx_budget_category ON budget_items(category);
    CREATE INDEX IF NOT EXISTS idx_milestones_plan ON milestones(plan_id);
    CREATE INDEX IF NOT EXISTS idx_milestones_done ON milestones(done);
    CREATE INDEX IF NOT EXISTS idx_vendors_plan ON vendors(plan_id);
    CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
    CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);
    CREATE INDEX IF NOT EXISTS idx_ideas_plan ON idea_groups(plan_id);
    CREATE INDEX IF NOT EXISTS idx_chat_plan ON chat_messages(plan_id);
    CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_moodboards_plan ON moodboards(plan_id);
    CREATE INDEX IF NOT EXISTS idx_guests_plan ON guests(plan_id);
    CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
    CREATE INDEX IF NOT EXISTS idx_guests_dietary ON guests(dietary);
  `)
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

