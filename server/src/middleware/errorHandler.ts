import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export function errorHandler(
  err: Error & { status?: number; type?: string },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error('[Error Handler]:', err)

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    })
  }

  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      error: 'Payload too large',
      message: 'Request body exceeds the maximum permitted size limit.',
    })
  }

  const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500
  const isProd = process.env.NODE_ENV === 'production'
  const is5xx = status >= 500
  const message = isProd && is5xx ? 'Something went wrong' : err.message || 'Internal server error'

  return res.status(status).json({
    error: message,
    ...(!isProd && err.stack ? { stack: err.stack } : {}),
  })
}
