/**
 * 構造化ログユーティリティ
 */

import type { Env } from '../types'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private logLevel: LogLevel

  constructor(env?: Env) {
    const envLevel = env?.PAWMATCH_NODE_ENV || 'production'
    this.logLevel = envLevel === 'development' ? LogLevel.DEBUG : LogLevel.INFO
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const baseLog = {
      timestamp,
      level,
      message,
      ...context,
    }
    return JSON.stringify(baseLog)
  }

  debug(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage('DEBUG', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.INFO) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage('INFO', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, context))
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.logLevel <= LogLevel.ERROR) {
      const errorContext = {
        ...context,
        error: error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : undefined,
      }
      console.error(this.formatMessage('ERROR', message, errorContext))
    }
  }
}

// シングルトンインスタンス
let loggerInstance: Logger | null = null

export function getLogger(env?: Env): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(env)
  }
  return loggerInstance
}

export function resetLogger(): void {
  loggerInstance = null
}
