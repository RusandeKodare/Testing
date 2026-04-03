import pino, { Logger } from 'pino';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create transport with pretty printing for development
const getTransport = () => {
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }
  
  return pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  });
};

// Root logger configuration with automatic redaction of sensitive data
const resolvedLogLevel =
  process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info');

const rootLogger = pino(
  {
    level: resolvedLogLevel,
    base: {
      env: process.env.NODE_ENV || 'development',
      service: 'auth-service'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'password',
        'confirmPassword',
        'passwordHash',
        'token',
        'authToken',
        'password_hash',
        'req.headers.authorization',
        'req.headers.cookie'
      ],
      remove: true
    }
  },
  getTransport()
);

// Create child loggers for different modules
const loggers: Map<string, Logger> = new Map();

/**
 * Get or create a logger for a specific module
 * Logs sensitive data like passwords are automatically redacted
 */
export function getLogger(module: string): Logger {
  if (loggers.has(module)) {
    return loggers.get(module)!;
  }

  const childLogger = rootLogger.child({ context: module });
  loggers.set(module, childLogger);
  return childLogger;
}

export const logger = rootLogger;

/**
 * Security-focused logging for authentication events
 * Automatically redacts sensitive information
 */
export function logSecurityEvent(
  event: 'login_attempt' | 'login_success' | 'login_failed' | 'registration' | 'lockout',
  data: Record<string, any>
) {
  const securityLogger = getLogger('security');
  
  switch (event) {
    case 'login_attempt':
      securityLogger.info({ event, username: data.username }, 'Login attempt');
      break;
    case 'login_success':
      securityLogger.info({ event, userId: data.userId }, 'Successful login');
      break;
    case 'login_failed':
      securityLogger.warn({ event, username: data.username, reason: data.reason }, 'Login failed');
      break;
    case 'registration':
      securityLogger.info({ event, username: data.username }, 'New user registration');
      break;
    case 'lockout':
      securityLogger.error({ event, username: data.username, attempts: data.attempts }, 'Account locked due to failed attempts');
      break;
  }
}

export default logger;
