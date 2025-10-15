/**
 * ヘルスチェックサービス
 * 各種サービス（Workers、Pages）の健全性を監視
 */

import type { Env } from '../types/env'
import type {
  WorkerHealth,
  PageHealth,
  AllServicesHealth,
} from '../types/health'

/**
 * タイムアウト設定（ミリ秒）
 */
const TIMEOUT = {
  WORKER: 5000, // Workers: 5秒
  PAGE: 10000, // Pages: 10秒
}

/**
 * ヘルスチェックサービス
 */
export class HealthService {
  constructor(private env: Env) {}

  /**
   * 全サービスのヘルスチェックを実行
   */
  async checkAllServices(): Promise<AllServicesHealth> {
    const [workers, pages] = await Promise.all([
      this.checkWorkers(),
      this.checkPages(),
    ])

    const summary = {
      total: workers.length + pages.length,
      healthy: [...workers, ...pages].filter((s) => s.status === 'healthy').length,
      unhealthy: [...workers, ...pages].filter((s) => s.status === 'unhealthy').length,
      skipped: [...workers, ...pages].filter((s) => s.status === 'skipped').length,
    }

    return {
      workers,
      pages,
      summary,
    }
  }

  /**
   * Workers のヘルスチェック（Service Bindings使用）
   */
  private async checkWorkers(): Promise<WorkerHealth[]> {
    const workers: Array<{ name: string; service: Fetcher }> = [
      { name: 'API', service: this.env.API_SERVICE },
      { name: 'Crawler', service: this.env.CRAWLER_SERVICE },
      { name: 'Dispatcher', service: this.env.DISPATCHER_SERVICE },
    ]

    return await Promise.all(
      workers.map((worker) => this.checkWorker(worker.name, worker.service))
    )
  }

  /**
   * 個別 Worker のヘルスチェック
   */
  private async checkWorker(name: string, service: Fetcher): Promise<WorkerHealth> {
    const timestamp = new Date().toISOString()

    try {
      const startTime = Date.now()

      // タイムアウト付きリクエスト
      const response = await this.fetchWithTimeout(
        service.fetch(new Request('http://worker/health')),
        TIMEOUT.WORKER
      )

      const responseTime = Date.now() - startTime

      // アクセス制限エラーの場合はスキップ
      if (this.isAccessRestricted(response.status)) {
        return {
          name,
          status: 'skipped',
          timestamp,
          error: this.getAccessRestrictedMessage(response.status),
        }
      }

      // ステータスコードが 200 番台なら正常
      if (response.ok) {
        return {
          name,
          status: 'healthy',
          responseTime,
          timestamp,
        }
      }

      // その他のエラー
      return {
        name,
        status: 'unhealthy',
        responseTime,
        timestamp,
        error: `HTTP ${response.status}`,
      }
    } catch (error) {
      // タイムアウトやネットワークエラー
      return {
        name,
        status: 'unhealthy',
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Pages のヘルスチェック（HTTP リクエスト使用）
   */
  private async checkPages(): Promise<PageHealth[]> {
    const pages: Array<{ name: string; url: string }> = [
      { name: 'Frontend (犬)', url: this.env.FRONTEND_DOG_URL },
      { name: 'Frontend (猫)', url: this.env.FRONTEND_CAT_URL },
      { name: 'LP', url: this.env.LP_URL },
    ]

    return await Promise.all(
      pages.map((page) => this.checkPage(page.name, page.url))
    )
  }

  /**
   * 個別 Page のヘルスチェック
   */
  private async checkPage(name: string, url: string): Promise<PageHealth> {
    const timestamp = new Date().toISOString()

    try {
      const startTime = Date.now()

      // タイムアウト付きリクエスト
      const response = await this.fetchWithTimeout(
        fetch(url),
        TIMEOUT.PAGE
      )

      const responseTime = Date.now() - startTime

      // アクセス制限エラーの場合はスキップ
      if (this.isAccessRestricted(response.status)) {
        return {
          name,
          url,
          status: 'skipped',
          timestamp,
          error: this.getAccessRestrictedMessage(response.status),
        }
      }

      // ステータスコードが 200 番台なら正常
      if (response.ok) {
        return {
          name,
          url,
          status: 'healthy',
          responseTime,
          timestamp,
        }
      }

      // その他のエラー
      return {
        name,
        url,
        status: 'unhealthy',
        responseTime,
        timestamp,
        error: `HTTP ${response.status}`,
      }
    } catch (error) {
      // タイムアウトやネットワークエラー
      return {
        name,
        url,
        status: 'unhealthy',
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * タイムアウト付きfetch
   */
  private async fetchWithTimeout(
    promise: Promise<Response>,
    timeoutMs: number
  ): Promise<Response> {
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    })

    return Promise.race([promise, timeoutPromise])
  }

  /**
   * アクセス制限エラーかどうかを判定
   * 401, 403, 429 などの認証・レート制限エラー、
   * およびその他の 4xx エラー（Cloudflare Access など）を含む
   */
  private isAccessRestricted(status: number): boolean {
    // 4xx 系エラーはすべてアクセス制限として扱う
    return status >= 400 && status < 500
  }

  /**
   * アクセス制限エラーメッセージを取得
   */
  private getAccessRestrictedMessage(status: number): string {
    switch (status) {
      case 401:
        return 'Unauthorized (認証エラー)'
      case 403:
        return 'Forbidden (アクセス拒否)'
      case 429:
        return 'Too Many Requests (レート制限)'
      default:
        return `Access Restricted (HTTP ${status})`
    }
  }
}
