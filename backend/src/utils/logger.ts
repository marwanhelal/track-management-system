import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  requestId?: string;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private logStream: WriteStream | null = null;
  private errorStream: WriteStream | null = null;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = this.getLogLevel();

    if (!this.isDevelopment) {
      this.initializeFileStreams();
    }
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private initializeFileStreams(): void {
    try {
      const logsDir = process.env.LOGS_DIR || './logs';
      const logFile = join(logsDir, 'app.log');
      const errorFile = join(logsDir, 'error.log');

      this.logStream = createWriteStream(logFile, { flags: 'a' });
      this.errorStream = createWriteStream(errorFile, { flags: 'a' });

      // Handle stream errors
      this.logStream.on('error', (err) => {
        console.error('Log stream error:', err);
      });

      this.errorStream.on('error', (err) => {
        console.error('Error stream error:', err);
      });
    } catch (error) {
      console.warn('Failed to initialize log files, falling back to console:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLogEntry(level: string, message: string, meta?: any, requestId?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      requestId,
    };
  }

  private writeToFile(entry: LogEntry, isError: boolean = false): void {
    if (!this.isDevelopment) {
      const logLine = JSON.stringify(entry) + '\n';
      const stream = isError && this.errorStream ? this.errorStream : this.logStream;

      if (stream) {
        stream.write(logLine);
      }
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (this.isDevelopment) {
      const { timestamp, level, message, meta, requestId } = entry;
      const reqId = requestId ? `[${requestId}]` : '';
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';

      switch (level) {
        case 'ERROR':
          console.error(`❌ ${timestamp} ${reqId} ${message}${metaStr}`);
          break;
        case 'WARN':
          console.warn(`⚠️ ${timestamp} ${reqId} ${message}${metaStr}`);
          break;
        case 'INFO':
          console.info(`ℹ️ ${timestamp} ${reqId} ${message}${metaStr}`);
          break;
        case 'DEBUG':
          console.debug(`🐛 ${timestamp} ${reqId} ${message}${metaStr}`);
          break;
        default:
          console.log(`📝 ${timestamp} ${reqId} ${message}${metaStr}`);
      }
    }
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: any, requestId?: string): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatLogEntry(levelName, message, meta, requestId);

    this.writeToConsole(entry);
    this.writeToFile(entry, level === LogLevel.ERROR);
  }

  // Public logging methods
  error(message: string, meta?: any, requestId?: string): void {
    this.log(LogLevel.ERROR, 'ERROR', message, meta, requestId);
  }

  warn(message: string, meta?: any, requestId?: string): void {
    this.log(LogLevel.WARN, 'WARN', message, meta, requestId);
  }

  info(message: string, meta?: any, requestId?: string): void {
    this.log(LogLevel.INFO, 'INFO', message, meta, requestId);
  }

  debug(message: string, meta?: any, requestId?: string): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta, requestId);
  }

  // Convenience methods for common scenarios
  database(message: string, meta?: any, requestId?: string): void {
    this.debug(`[DATABASE] ${message}`, meta, requestId);
  }

  api(message: string, meta?: any, requestId?: string): void {
    this.info(`[API] ${message}`, meta, requestId);
  }

  security(message: string, meta?: any, requestId?: string): void {
    this.warn(`[SECURITY] ${message}`, meta, requestId);
  }

  performance(message: string, meta?: any, requestId?: string): void {
    this.info(`[PERFORMANCE] ${message}`, meta, requestId);
  }

  socket(message: string, meta?: any, requestId?: string): void {
    this.debug(`[SOCKET] ${message}`, meta, requestId);
  }

  cache(message: string, meta?: any, requestId?: string): void {
    this.debug(`[CACHE] ${message}`, meta, requestId);
  }

  // Method to log HTTP requests
  request(req: any, res: any, responseTime?: number): void {
    const meta = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      userId: req.user?.id,
      userRole: req.user?.role,
    };

    this.api(`${req.method} ${req.url} - ${res.statusCode}`, meta, req.requestId);
  }

  // Method to log database queries
  query(queryText: string, duration: number, rowCount?: number, requestId?: string): void {
    if (this.isDevelopment) {
      this.database(`Query executed`, {
        query: queryText.substring(0, 100) + (queryText.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: rowCount,
      }, requestId);
    }
  }

  // Method to log cache operations
  cacheHit(key: string, requestId?: string): void {
    this.cache(`Cache HIT`, { key }, requestId);
  }

  cacheMiss(key: string, requestId?: string): void {
    this.cache(`Cache MISS`, { key }, requestId);
  }

  // Cleanup method
  close(): void {
    if (this.logStream) {
      this.logStream.end();
    }
    if (this.errorStream) {
      this.errorStream.end();
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.close();
});

process.on('SIGINT', () => {
  logger.close();
});

export default logger;

// Helper function to get request ID from request object
export const getRequestId = (req: any): string | undefined => {
  return req?.requestId;
};

// Helper function to create request-scoped logger
export const createRequestLogger = (requestId: string) => ({
  error: (message: string, meta?: any) => logger.error(message, meta, requestId),
  warn: (message: string, meta?: any) => logger.warn(message, meta, requestId),
  info: (message: string, meta?: any) => logger.info(message, meta, requestId),
  debug: (message: string, meta?: any) => logger.debug(message, meta, requestId),
  database: (message: string, meta?: any) => logger.database(message, meta, requestId),
  api: (message: string, meta?: any) => logger.api(message, meta, requestId),
  security: (message: string, meta?: any) => logger.security(message, meta, requestId),
  performance: (message: string, meta?: any) => logger.performance(message, meta, requestId),
  socket: (message: string, meta?: any) => logger.socket(message, meta, requestId),
  cache: (message: string, meta?: any) => logger.cache(message, meta, requestId),
});