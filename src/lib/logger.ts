/**
 * Structured Logger Utility
 * 
 * Provides consistent logging with log levels.
 * Debug logs are only shown in development mode.
 * Sensitive data is automatically masked.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

/**
 * Mask sensitive data in logs
 */
function maskSensitive(value: unknown): unknown {
  if (typeof value === 'string') {
    // Mask tokens, codes, and secrets
    if (value.length > 20) {
      return value.substring(0, 8) + '...[masked]';
    }
  }
  if (typeof value === 'object' && value !== null) {
    const masked: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Mask sensitive field names
      const sensitiveKeys = ['token', 'secret', 'password', 'code', 'verifier', 'key', 'access', 'refresh'];
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        masked[key] = typeof val === 'string' && val.length > 4 
          ? val.substring(0, 4) + '...[masked]' 
          : '[masked]';
      } else {
        masked[key] = val;
      }
    }
    return masked;
  }
  return value;
}

/**
 * Format log message with timestamp and context
 */
function formatMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString().substring(11, 23);
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

/**
 * Create a logger for a specific context
 */
export function createLogger(context: string) {
  return {
    /**
     * Debug logs - only shown in development
     */
    debug: (message: string, ...args: unknown[]) => {
      if (isDev) {
        console.log(
          formatMessage('debug', context, message),
          ...args.map(maskSensitive)
        );
      }
    },

    /**
     * Info logs - shown in all environments
     */
    info: (message: string, ...args: unknown[]) => {
      console.info(
        formatMessage('info', context, message),
        ...args.map(maskSensitive)
      );
    },

    /**
     * Warning logs
     */
    warn: (message: string, ...args: unknown[]) => {
      console.warn(
        formatMessage('warn', context, message),
        ...args.map(maskSensitive)
      );
    },

    /**
     * Error logs - always shown, masks sensitive data
     */
    error: (message: string, error?: unknown) => {
      // Don't log full error objects in production to avoid leaking sensitive data
      if (isDev && error) {
        console.error(formatMessage('error', context, message), error);
      } else {
        console.error(
          formatMessage('error', context, message),
          error instanceof Error ? error.message : ''
        );
      }
    },
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger('App');

/**
 * Pre-configured loggers for common contexts
 */
export const authLogger = createLogger('Auth');
export const spotifyLogger = createLogger('Spotify');
export const apiLogger = createLogger('API');
