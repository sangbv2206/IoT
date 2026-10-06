'use strict';

const colors = {
  reset: '\x1b[0m',
  info: '\x1b[36m',       // Cyan
  success: '\x1b[32m',    // Green
  warn: '\x1b[33m',       // Yellow
  error: '\x1b[31m',      // Red
  timestamp: '\x1b[90m'   // Dark Grey
};

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

const logger = {
  info: (...args) => console.log(`${colors.timestamp}[${getTimestamp()}]${colors.reset} ${colors.info}[INFO]${colors.reset}`, ...args),
  success: (...args) => console.log(`${colors.timestamp}[${getTimestamp()}]${colors.reset} ${colors.success}[SUCCESS]${colors.reset}`, ...args),
  warn: (...args) => console.warn(`${colors.timestamp}[${getTimestamp()}]${colors.reset} ${colors.warn}[WARN]${colors.reset}`, ...args),
  error: (...args) => console.error(`${colors.timestamp}[${getTimestamp()}]${colors.reset} ${colors.error}[ERROR]${colors.reset}`, ...args)
};

module.exports = logger;
