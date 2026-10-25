import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getDb } from '../db/index.js'
import { clearAuthCookie, requireAuth, setAuthCookie } from '../middleware/auth.js'
import { uid } from '../services/generator.js'

export const authRouter = Router()

const registerSchema = z
  .object({
    email: z.string().trim().email('Please enter a valid email address').max(254),
    password: z.string().min(6, 'Password must be at least 6 characters long').max(128),
  })
  .strict()

const loginSchema = z
  .object({
    email: z.string().trim().email('Please enter a valid email address').max(254),
    password: z.string().min(1, 'Password is required').max(128),
  })
  .strict()

// POST /api/auth/register
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password } = registerSchema.parse(req.body)
    const normalizedEmail = email.toLowerCase().trim()
    const db = getDb()

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    const id = uid()
    const now = Date.now()

    db.prepare(
      `
      INSERT INTO users (id, email, password_hash, is_guest, created_at)
      VALUES (?, ?, ?, 0, ?)
    `,
    ).run(id, normalizedEmail, hash, now)

    const user = { id, email: normalizedEmail, isGuest: false }
    setAuthCookie(res, user)
    return res.status(201).json({ user: { ...user, createdAt: now } })
  } catch (err) {
    next(err)
  }
})

interface UserRow {
  id: string
  email: string | null
  password_hash: string | null
  is_guest: number
  created_at: number
}

// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const normalizedEmail = email.toLowerCase().trim()
    const db = getDb()

    const userRow = db
      .prepare('SELECT id, email, password_hash, is_guest, created_at FROM users WHERE email = ?')
      .get(normalizedEmail) as UserRow | undefined
    if (!userRow || !userRow.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await bcrypt.compare(password, userRow.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = { id: userRow.id, email: userRow.email, isGuest: false }
    setAuthCookie(res, user)
    return res.json({ user: { ...user, createdAt: userRow.created_at } })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/guest - 1-Click Guest Access for instant evaluation
authRouter.post('/guest', (_req, res, next) => {
  try {
    const db = getDb()
    const id = `guest_${uid()}`
    const now = Date.now()

    db.prepare(
      `
      INSERT INTO users (id, email, password_hash, is_guest, created_at)
      VALUES (?, NULL, NULL, 1, ?)
    `,
    ).run(id, now)

    const user = { id, email: null, isGuest: true }
    setAuthCookie(res, user)
    return res.status(201).json({ user: { ...user, createdAt: now } })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req, res, next) => {
  try {
    const db = getDb()
    const userRow = db.prepare('SELECT id, email, is_guest, created_at FROM users WHERE id = ?').get(req.user!.id) as
      UserRow | undefined
    if (!userRow) {
      clearAuthCookie(res)
      return res.status(401).json({ error: 'User not found' })
    }
    return res.json({
      user: {
        id: userRow.id,
        email: userRow.email,
        isGuest: Boolean(userRow.is_guest),
        createdAt: userRow.created_at,
      },
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  return res.json({ message: 'Logged out successfully' })
})
