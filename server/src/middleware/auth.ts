import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthenticatedUser {
  id: string
  email: string | null
  isGuest: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

export const DEFAULT_JWT_SECRET = 'soiree-default-jwt-secret-do-not-use-in-real-prod'
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET
const COOKIE_NAME = 'soiree_token'

export function signToken(user: AuthenticatedUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, isGuest: user.isGuest },
    JWT_SECRET,
    { expiresIn: '30d' },
  )
}

export function extractToken(req: Request): string | null {
  if (req.cookies?.[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME]
  }
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }
  return null
}

export function setAuthCookie(res: Response, user: AuthenticatedUser): string {
  const token = signToken(user)
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days sliding session
  })
  return token
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Please sign in or continue as guest' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthenticatedUser
    req.user = {
      id: payload.id,
      email: payload.email,
      isGuest: Boolean(payload.isGuest),
    }
    // Sliding session: refresh session cookie for active authenticated requests
    if (req.cookies?.[COOKIE_NAME]) {
      setAuthCookie(res, req.user)
    }
    next()
  } catch {
    clearAuthCookie(res)
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' })
  }
}

function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req)
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthenticatedUser
      req.user = {
        id: payload.id,
        email: payload.email,
        isGuest: Boolean(payload.isGuest),
      }
      if (req.cookies?.[COOKIE_NAME]) {
        setAuthCookie(res, req.user)
      }
    } catch {
      // Ignore invalid token in optionalAuth
    }
  }
  next()
}
