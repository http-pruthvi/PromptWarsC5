import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import compression from 'compression'
import { authRouter } from './routes/auth.js'
import { plansRouter } from './routes/plans.js'
import { healthRouter } from './routes/health.js'
import { errorHandler } from './middleware/errorHandler.js'
import { publicRouter } from './routes/public.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const app = express()

// Enable ETag
app.set('etag', 'strong')

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// Response compression
app.use(compression())

// Security headers: Helmet CSP, COOP, CORP, Referrer-Policy, and HSTS
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
)

// Permissions-Policy header
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  )
  next()
})

const SECURITY_TXT = `Contact: mailto:security@soiree.app
Expires: 2027-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://soiree.app/.well-known/security.txt
Policy: https://github.com/soiree/soiree/blob/main/SECURITY.md
`

// RFC 9116 security contact endpoints
app.get(['/.well-known/security.txt', '/security.txt'], (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.send(SECURITY_TXT)
})

// CORS for local development and production
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)

// Body and cookie parsing with strict size limits
app.use(express.json({ limit: '256kb' }))
app.use(express.urlencoded({ extended: false, limit: '100kb' }))
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

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests for shared plans, please try again later.' },
})

// Prevent caching for all API endpoints
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

// Mount API routes
app.use('/api', apiLimiter)
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/plans', plansRouter)
app.use('/api/public', publicLimiter, publicRouter)
app.use('/api/health', healthRouter)

// Serve frontend in production with caching strategies
const clientDistPath = path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(clientDistPath)) {
  // Long-lived cache for hashed Vite assets (1 year, immutable)
  app.use(
    '/assets',
    express.static(path.join(clientDistPath, 'assets'), {
      maxAge: 31536000000,
      immutable: true,
    }),
  )

  // Unhashed assets (favicon, manifest, etc.) with validation
  app.use(
    express.static(clientDistPath, {
      maxAge: 0,
      etag: true,
      lastModified: true,
    }),
  )

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(clientDistPath, 'index.html'))
  })
}

// Centralized error handling
app.use(errorHandler)
