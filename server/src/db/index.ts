import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { SCHEMA } from './schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let dbInstance: Database.Database | null = null

export function initDb(customPath?: string): Database.Database {
  if (dbInstance && !customPath) return dbInstance

  const dbPath = customPath || path.resolve(__dirname, '../../data/soiree.db')
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)

  if (!customPath) {
    dbInstance = db
  }
  return db
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = initDb()
  }
  return dbInstance
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
