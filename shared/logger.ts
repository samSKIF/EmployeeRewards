/**
 * Centralized logging utility for the application
 * Provides consistent logging across frontend and backend
 */

export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', ...args);
    }
  },
  
  info: (...args: any[]) => {
    console.info('[INFO]', ...args);
  },
  
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  
  log: (...args: any[]) => {
    console.log('[LOG]', ...args);
  }
};

export default logger;