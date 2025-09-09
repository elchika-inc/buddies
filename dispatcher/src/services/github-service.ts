/**
 * GitHub Actionsワークフローを制御するサービス
 */

import type { Env, Pet } from '../types'
import { Result, Ok, Err } from '../types/result'

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds`)
    this.name = 'RateLimitError'
  }
}

export interface WorkflowInputs {
  batchData: string
  batchId: string
  limit: string
}

export class GitHubService {
  private readonly githubToken: string
  private readonly githubOwner: string
  private readonly githubRepo: string
  private readonly workflowFile: string

  constructor(env: Env) {
    this.githubToken = env.GITHUB_TOKEN
    this.githubOwner = env.GITHUB_OWNER
    this.githubRepo = env.GITHUB_REPO
    this.workflowFile = env.WORKFLOW_FILE
  }

  /**
   * GitHub Actionsワークフローをトリガー
   */
  async triggerWorkflow(pets: Pet[], batchId: string): Promise<Result<void>> {
    try {
      const url = this.buildWorkflowUrl()
      const payload = this.buildWorkflowPayload(pets, batchId)

      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return this.handleErrorResponse(response)
      }

      console.log(`GitHub workflow triggered successfully for batch: ${batchId}`)
      return Ok(undefined)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Err(new Error(`GitHub workflow trigger failed: ${errorMessage}`))
    }
  }

  /**
   * ワークフローAPIのURLを構築
   */
  private buildWorkflowUrl(): string {
    return `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}/actions/workflows/${this.workflowFile}/dispatches`
  }

  /**
   * リクエストヘッダーを構築
   */
  private buildHeaders(): Record<string, string> {
    return {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${this.githubToken}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * ワークフローペイロードを構築
   */
  private buildWorkflowPayload(pets: Pet[], batchId: string) {
    // PetRecordをJSONファイル形式に変換
    const petsData = pets.map((pet) => ({
      id: pet.id,
      name: pet.name,
      sourceUrl: pet.source_url || '',
      type: pet.type,
    }))

    return {
      ref: 'main',
      inputs: {
        batch_data: JSON.stringify(petsData),
        batch_id: batchId,
        limit: String(pets.length),
      },
    }
  }

  /**
   * エラーレスポンスを処理
   */
  private handleErrorResponse(response: Response): Result<void> {
    // Rate Limitエラーの場合
    if (response.status === 429) {
      const retryAfter = this.extractRetryAfter(response)
      return Err(new RateLimitError(retryAfter))
    }

    // 認証エラー
    if (response.status === 401) {
      return Err(new Error('GitHub authentication failed. Please check your token.'))
    }

    // 権限エラー
    if (response.status === 403) {
      return Err(new Error('GitHub permission denied. Please check your repository permissions.'))
    }

    // Not Found
    if (response.status === 404) {
      return Err(new Error('GitHub workflow not found. Please check your workflow file path.'))
    }

    // その他のエラー
    return Err(new Error(`GitHub API error: ${response.status} ${response.statusText}`))
  }

  /**
   * Retry-Afterヘッダーから待機時間を抽出
   */
  private extractRetryAfter(response: Response): number {
    const retryAfterHeader = response.headers.get('Retry-After')

    if (retryAfterHeader) {
      const seconds = parseInt(retryAfterHeader, 10)
      if (!isNaN(seconds)) {
        return seconds
      }
    }

    // デフォルトは60秒
    return 60
  }

  /**
   * ワークフローの実行状態を確認（将来の実装用）
   */
  async checkWorkflowStatus(runId: string): Promise<Result<string>> {
    try {
      const url = `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}/actions/runs/${runId}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${this.githubToken}`,
        },
      })

      if (!response.ok) {
        return Err(new Error(`Failed to check workflow status: ${response.status}`))
      }

      const data = (await response.json()) as { status?: string }
      return Ok(data.status || 'unknown')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Err(new Error(`Failed to check workflow status: ${errorMessage}`))
    }
  }
}
