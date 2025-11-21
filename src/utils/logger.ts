/**
 * Logger utility module
 * Provides configurable logging with timestamp support and multiple log levels
 */

/**
 * Log levels with numerical values for comparison
 */
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

/**
 * Current log level from environment or default
 */
const CURRENT_LOG_LEVEL =
  LOG_LEVELS[process.env.LOG_LEVEL as keyof typeof LOG_LEVELS] ||
  LOG_LEVELS.info;

/**
 * Logs a message with timestamp and log level.
 * Only logs if the message level is <= current log level.
 *
 * @param level - Log level: 'error', 'warn', 'info', or 'debug'
 * @param message - Log message
 * @param args - Additional arguments to log
 *
 * @example
 * ```typescript
 * log('info', 'Server started on port 3000');
 * log('error', 'Failed to fetch data', error);
 * ```
 */
const log = (
  level: keyof typeof LOG_LEVELS,
  message: string,
  ...args: unknown[]
) => {
  if (LOG_LEVELS[level] <= CURRENT_LOG_LEVEL) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, ...args);
  }
};

export { log, LOG_LEVELS, CURRENT_LOG_LEVEL };
