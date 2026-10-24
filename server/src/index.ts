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

// Refuse startup in production if JWT_SECRET is missing or equals the default placeholder
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret || secret === DEFAULT_JWT_SECRET) {
    console.error(
      `[FATAL] Server startup aborted: In production mode, JWT_SECRET must be configured and cannot be empty or match the default placeholder ("${DEFAULT_JWT_SECRET}"). Please set a strong, secure JWT_SECRET in your environment.`
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
