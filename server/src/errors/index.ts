/**
 * Base application error class for structured HTTP error responses.
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details: unknown

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 400 Bad Request error for invalid input or unprocessable state.
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

/**
 * 401 Unauthorized error for missing or invalid authentication credentials.
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

/**
 * 403 Forbidden error for authenticated users without access rights.
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'FORBIDDEN')
  }
}

/**
 * 404 Not Found error for missing entities or unmapped endpoints.
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

/**
 * 409 Conflict error for unique constraint violations or conflicting state.
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT')
  }
}

/**
 * 413 Payload Too Large error for oversized request bodies.
 */
export class PayloadTooLargeError extends AppError {
  constructor(message: string = 'Request payload exceeds limit') {
    super(message, 413, 'PAYLOAD_TOO_LARGE')
  }
}

/**
 * 429 Rate Limit error for exceeded operation quotas.
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded, please retry later') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}
