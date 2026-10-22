import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error Handler]:', err)

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    })
  }

  const status = typeof err.status === 'number' ? err.status : 500
  const message = err.message || 'Internal server error'

  return res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
  })
}
