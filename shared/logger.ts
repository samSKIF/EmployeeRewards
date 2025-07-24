/**
 * Simple logger utility
 */

interface LogLevel {
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug',
};

function formatLogMessage(
  level: string,
  message: string,
  ...args: any[]
): string {
  const timestamp = new Date().toISOString();
  const formattedArgs =
    args.length > 0
      ? ` ${args
          .map((arg) =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          )
          .join(' ')}`
      : '';

  return `[${timestamp}] ${level.toUpperCase()}: ${message}${formattedArgs}`;
}

export const logger = {
  info(message: string, ...args: any[]) {
    const logMessage = formatLogMessage(LOG_LEVELS.INFO, message, ...args);
    console.log(logMessage);
  },

  warn(message: string, ...args: any[]) {
    const logMessage = formatLogMessage(LOG_LEVELS.WARN, message, ...args);
    console.warn(logMessage);
  },

  error(message: string, ...args: any[]) {
    const logMessage = formatLogMessage(LOG_LEVELS.ERROR, message, ...args);
    console.error(logMessage);
  },

  debug(message: string, ...args: any[]) {
    const logMessage = formatLogMessage(LOG_LEVELS.DEBUG, message, ...args);
    if (process.env.NODE_ENV === 'development') {
      console.debug(logMessage);
    }
  },
};
