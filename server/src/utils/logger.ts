export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  requestId?: string | undefined
  context?: Record<string, unknown> | undefined
  error?:
    | {
        name: string
        message: string
        stack?: string | undefined
      }
    | undefined
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ?? (process.env.NODE_ENV === 'test' ? 'error' : 'info')

/**
 * Format and write structured log entries.
 */
function outputLog(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) {
    return
  }

  // Silence logs in tests unless explicitly enabled
  if (process.env.NODE_ENV === 'test' && !process.env.DEBUG_LOGS) {
    return
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
    ...(error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : {}),
  }

  const formatted = JSON.stringify(entry)
  if (level === 'error') {
    process.stderr.write(`${formatted}\n`)
  } else {
    process.stdout.write(`${formatted}\n`)
  }
}

/**
 * Lightweight structured application logger.
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>): void => {
    outputLog('debug', message, context)
  },
  info: (message: string, context?: Record<string, unknown>): void => {
    outputLog('info', message, context)
  },
  warn: (message: string, context?: Record<string, unknown>): void => {
    outputLog('warn', message, context)
  },
  error: (message: string, error?: Error, context?: Record<string, unknown>): void => {
    outputLog('error', message, context, error)
  },
}
