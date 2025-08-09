import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined,
  redact: {
    paths: [
      'password', '*.password', 'headers.authorization', 'req.headers.authorization',
      'token', '*.token', 'id_token', 'access_token', 'refresh_token',
      'email', '*.email', 'phone', '*.phone'
    ],
    censor: '[REDACTED]'
  }
});