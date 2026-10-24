import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { app } from './app.js'
import { initDb } from './db/index.js'

import { DEFAULT_JWT_SECRET } from './middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load root .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const KNOWN_INSECURE_SECRETS = new Set([
  DEFAULT_JWT_SECRET.toLowerCase(),
  'secret',
  'jwt_secret',
  'changeme',
  'password',
  '12345678901234567890123456789012',
  'abcdefghijklmnopqrstuvwxyz123456',
  'production-secret-key-change-this-now',
])

// Production startup guards: refuse to boot with missing, short (<32 chars), or insecure JWT secret
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) {
    console.error('[FATAL] Server startup aborted: In production mode, JWT_SECRET must be configured.')
    process.exit(1)
  }
  if (secret.length < 32) {
    console.error(
      `[FATAL] Server startup aborted: In production mode, JWT_SECRET must be at least 32 characters long for cryptographic security (current length: ${secret.length} characters).`
    )
    process.exit(1)
  }
  if (KNOWN_INSECURE_SECRETS.has(secret.toLowerCase())) {
    console.error(
      '[FATAL] Server startup aborted: In production mode, JWT_SECRET cannot match a default, trivial, or well-known placeholder string.'
    )
    process.exit(1)
  }
}

// Initialize SQLite database
initDb()

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`[Soirée Backend] Server listening on http://localhost:${PORT}`)
  console.log(`[Soirée Backend] Database ready at server/data/soiree.db`)
  console.log(`[Soirée Backend] Gemini GenAI mode: ${process.env.GEMINI_API_KEY ? 'Active (API key detected)' : 'Offline smart engine (No key needed)'}`)
})
