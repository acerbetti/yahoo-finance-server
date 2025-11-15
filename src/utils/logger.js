/**
 * Logger utility module
 * Provides configurable logging with timestamp support and multiple log levels
 * @module utils/logger
 */

/**
 * Log levels with numerical values for comparison
 * @const {Object} LOG_LEVELS
 */
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

/**
 * Current log level from environment or default
 * @const {number} CURRENT_LOG_LEVEL
 */
const CURRENT_LOG_LEVEL =
  LOG_LEVELS[process.env.LOG_LEVEL || "info"] || LOG_LEVELS.info;

/**
 * Logs a message with timestamp and log level
 * Only logs if the message level is <= current log level
 *
 * @param {string} level - Log level: 'error', 'warn', 'info', or 'debug'
 * @param {string} message - Log message
 * @param {...*} args - Additional arguments to log
 *
 * @example
 * log('info', 'Server started on port 3000');
 * log('error', 'Failed to fetch data', error);
 */
const log = (level, message, ...args) => {
  if (LOG_LEVELS[level] <= CURRENT_LOG_LEVEL) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, ...args);
  }
};

export { log, LOG_LEVELS, CURRENT_LOG_LEVEL };
