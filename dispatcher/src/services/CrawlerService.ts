/**
 * クローラーサービス
 * GitHub Actionsのクローラーワークフローをトリガー
 */

import { GitHubService } from './GithubService'
import { QueueService } from './QueueService'
import { Result } from '../types/result'
import type { Env } from '../types'
import { BATCH_LIMITS } from '../constants'

export interface CrawlerResponse {
  success: boolean
  message?: string
  error?: string
  workflowRunId?: number
  type?: string
  limit?: number
  batchId?: string
}

export class CrawlerService {
  private githubService: GitHubService

  constructor(env: Env) {
    // 新しいプレフィックス付き環境変数を優先、旧名にフォールバック
    const githubToken = env.PAWMATCH_GITHUB_TOKEN || env.GITHUB_TOKEN || ''
    this.githubService = new GitHubService(githubToken)
  }

  /**
   * クローラーワークフローをトリガー
   * @param type - ペットタイプ（dog, cat, both）
   * @param limit - 取得するペットの最大数
   */
  async triggerCrawler(
    type: 'dog' | 'cat' | 'both',
    limit: number = BATCH_LIMITS.DEFAULT_CRAWLER
  ): Promise<CrawlerResponse> {
    try {
      // バッチIDを生成
      const batchId = QueueService.generateBatchId('crawler')

      // GitHub Actionsワークフローをトリガー（簡略化）
      const pets: any[] = [] // クローラーは空のペット配列でトリガー
      const result = await this.githubService.triggerWorkflow(pets, batchId)

      if (Result.isErr(result)) {
        console.error('Failed to trigger crawler workflow:', result.error)
        return {
          success: false,
          error: result.error.message,
        }
      }

      return {
        success: true,
        message: 'Crawler workflow triggered successfully',
        type,
        limit,
        batchId,
      }
    } catch (error) {
      console.error('Crawler trigger error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}
