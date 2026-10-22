import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { authRouter } from './routes/auth.js'
import { plansRouter } from './routes/plans.js'
import { healthRouter } from './routes/health.js'
import { errorHandler } from './middleware/errorHandler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const app = express()

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
)

// CORS for local development and production
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)

// Body and cookie parsing
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
})

// Mount API routes
app.use('/api', apiLimiter)
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/plans', plansRouter)
app.use('/api/health', healthRouter)

// Serve frontend in production
const clientDistPath = path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.sendFile(path.join(clientDistPath, 'index.html'))
  })
}

// Centralized error handling
app.use(errorHandler)
