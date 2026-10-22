import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { app } from './app.js'
import { initDb } from './db/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load root .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Initialize SQLite database
initDb()

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`[Soirée Backend] Server listening on http://localhost:${PORT}`)
  console.log(`[Soirée Backend] Database ready at server/data/soiree.db`)
  console.log(`[Soirée Backend] Gemini GenAI mode: ${process.env.GEMINI_API_KEY ? 'Active (API key detected)' : 'Offline smart engine (No key needed)'}`)
})
