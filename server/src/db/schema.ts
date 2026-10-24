export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  is_guest INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  date TEXT NOT NULL,
  guests INTEGER NOT NULL,
  budget REAL NOT NULL,
  currency TEXT NOT NULL,
  city TEXT NOT NULL,
  vibe TEXT NOT NULL,
  notes TEXT NOT NULL,
  summary TEXT NOT NULL,
  generated_by TEXT NOT NULL,
  share_token TEXT UNIQUE,
  share_enabled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budget_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  allocated REAL NOT NULL,
  spent REAL NOT NULL,
  note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  detail TEXT NOT NULL,
  weeks_before REAL NOT NULL,
  done INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  estimate REAL NOT NULL,
  tips TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idea_groups (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  items_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS moodboards (
  id TEXT PRIMARY KEY,
  plan_id TEXT UNIQUE NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  json TEXT NOT NULL,
  generated_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  party INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  dietary TEXT NOT NULL DEFAULT 'none',
  notes TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_plan ON budget_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_milestones_plan ON milestones(plan_id);
CREATE INDEX IF NOT EXISTS idx_vendors_plan ON vendors(plan_id);
CREATE INDEX IF NOT EXISTS idx_ideas_plan ON idea_groups(plan_id);
CREATE INDEX IF NOT EXISTS idx_chat_plan ON chat_messages(plan_id);
CREATE INDEX IF NOT EXISTS idx_moodboards_plan ON moodboards(plan_id);
CREATE INDEX IF NOT EXISTS idx_guests_plan ON guests(plan_id);
`
