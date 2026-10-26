import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/index.js'
import { logger } from '../utils/logger.js'

function handleKnownError(err: Error & { status?: number; type?: string; code?: string }, res: Response): boolean {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    })
    return true
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    })
    return true
  }

  if (err.type === 'entity.too.large' || err.status === 413) {
    res.status(413).json({
      error: 'Payload too large',
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body exceeds the maximum permitted size limit.',
    })
    return true
  }

  return false
}

function resolveStatus(status?: number): number {
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return status
  }
  return 500
}

/**
 * Global Express error handling middleware.
 * Translates AppError, ZodError, body parser entity size errors, and unexpected exceptions into JSON.
 */
export function errorHandler(
  err: Error & { status?: number; type?: string; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response | void {
  logger.error(err.message, err, { code: err.code, type: err.type })

  if (handleKnownError(err, res)) {
    return
  }

  const status = resolveStatus(err.status)
  const isProd = process.env.NODE_ENV === 'production'
  const message = isProd && status >= 500 ? 'Something went wrong' : err.message || 'Internal server error'

  return res.status(status).json({
    error: message,
    ...(!isProd && err.stack ? { stack: err.stack } : {}),
  })
}
