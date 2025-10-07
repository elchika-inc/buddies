/**
 * Logger ユーティリティのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLogger, resetLogger } from './logger'
import type { Env } from '../types'

describe('Logger', () => {
  beforeEach(() => {
    resetLogger()
    vi.clearAllMocks()
  })

  describe('getLogger', () => {
    it('should return a logger instance', () => {
      const logger = getLogger()
      expect(logger).toBeDefined()
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })

    it('should return the same instance when called multiple times', () => {
      const logger1 = getLogger()
      const logger2 = getLogger()
      expect(logger1).toBe(logger2)
    })
  })

  describe('log levels', () => {
    it('should log info messages in production mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = getLogger({ BUDDIES_NODE_ENV: 'production' } as unknown as Env)

      logger.info('test message')

      expect(consoleSpy).toHaveBeenCalled()
      const logOutput = consoleSpy.mock.calls[0]?.[0] || ''
      expect(logOutput).toContain('INFO')
      expect(logOutput).toContain('test message')
    })

    it('should not log debug messages in production mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = getLogger({ BUDDIES_NODE_ENV: 'production' } as unknown as Env)

      logger.debug('debug message')

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should log debug messages in development mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = getLogger({ BUDDIES_NODE_ENV: 'development' } as unknown as Env)

      logger.debug('debug message')

      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('error logging', () => {
    it('should log error with stack trace', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = getLogger()
      const testError = new Error('test error')

      logger.error('Error occurred', testError)

      expect(consoleSpy).toHaveBeenCalled()
      const logOutput = consoleSpy.mock.calls[0]?.[0] || ''
      expect(logOutput).toContain('ERROR')
      expect(logOutput).toContain('Error occurred')
      expect(logOutput).toContain('test error')
    })

    it('should log error with context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = getLogger()

      logger.error('Error with context', undefined, { userId: '123', action: 'test' })

      expect(consoleSpy).toHaveBeenCalled()
      const logOutput = consoleSpy.mock.calls[0]?.[0] || ''
      const parsed = JSON.parse(logOutput)
      expect(parsed.userId).toBe('123')
      expect(parsed.action).toBe('test')
    })
  })
})
