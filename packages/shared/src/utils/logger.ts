/**
 * 環境に応じたログレベル管理
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug: (message: string, data?: unknown) => void
  info: (message: string, data?: unknown) => void
  warn: (message: string, data?: unknown) => void
  error: (message: string, data?: unknown) => void
}

const isDevelopment = (typeof import.meta !== 'undefined' && import.meta.env?.DEV) === true

class AppLogger implements Logger {
  private log(level: LogLevel, message: string, data?: unknown) {
    if (!isDevelopment && level === 'debug') {
      return
    }

    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`
    
    if (data) {
      console[level](logMessage, data)
    } else {
      console[level](logMessage)
    }
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data)
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data)
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data)
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data)
  }
}

export const logger = new AppLogger()