/**
 * GitHub Actionsワークフローを制御するサービス
 */

import type { Env, Pet, ConversionData } from '../types'
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

  constructor(tokenOrEnv: string | Env) {
    if (typeof tokenOrEnv === 'string') {
      // トークンのみが渡された場合
      this.githubToken = tokenOrEnv
      this.githubOwner = 'elchika-inc'
      this.githubRepo = 'pawmatch'
      this.workflowFile = 'screenshot-capture.yml'
    } else {
      // Env全体が渡された場合
      this.githubToken = tokenOrEnv.PAWMATCH_GITHUB_TOKEN || tokenOrEnv.GITHUB_TOKEN || ''
      this.githubOwner = tokenOrEnv.PAWMATCH_GITHUB_OWNER || 'elchika-inc'
      this.githubRepo = tokenOrEnv.PAWMATCH_GITHUB_REPO || 'pawmatch'
      this.workflowFile = tokenOrEnv.PAWMATCH_GITHUB_WORKFLOW_FILE || 'screenshot-capture.yml'
    }
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
        return await this.handleErrorResponse(response)
      }

      // eslint-disable-next-line no-console
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
      Authorization: `Bearer ${this.githubToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'pawmatch-dispatcher/1.0.0',
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
      sourceUrl: pet.sourceUrl || '',
      type: pet.type,
    }))

    return {
      ref: 'main',
      inputs: {
        batch_data: JSON.stringify(petsData),
        batch_id: batchId,
        limit: String(pets.length),
        trigger_conversion: 'true', // 自動的にImage Conversionをトリガー
      },
    }
  }

  /**
   * エラーレスポンスを処理
   */
  private async handleErrorResponse(response: Response): Promise<Result<void>> {
    // エラーレスポンスのボディを取得してログに出力
    let errorBody = ''
    try {
      errorBody = await response.text()
      console.error('GitHub API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        rateLimitRemaining: response.headers.get('x-ratelimit-remaining'),
        rateLimitReset: response.headers.get('x-ratelimit-reset'),
      })
    } catch {
      console.error('Failed to read error response body')
    }

    // Rate Limitエラーの場合
    if (response.status === 429) {
      const retryAfter = this.extractRetryAfter(response)
      return Err(new RateLimitError(retryAfter))
    }

    // 認証エラー
    if (response.status === 401) {
      return Err(new Error(`GitHub authentication failed. ${errorBody}`))
    }

    // 権限エラー
    if (response.status === 403) {
      return Err(new Error(`GitHub permission denied. ${errorBody}`))
    }

    // Not Found
    if (response.status === 404) {
      return Err(new Error(`GitHub workflow not found. ${errorBody}`))
    }

    // その他のエラー
    return Err(
      new Error(`GitHub API error: ${response.status} ${response.statusText}. ${errorBody}`)
    )
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
   * 画像変換ワークフローをトリガー
   */
  async triggerConversionWorkflow(
    conversionData: ConversionData[],
    batchId: string,
    workflowFile: string
  ): Promise<Result<void>> {
    try {
      const url = `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}/actions/workflows/${workflowFile}/dispatches`

      const payload = {
        ref: 'main',
        inputs: {
          pets_data: JSON.stringify(conversionData),
          batch_id: batchId,
          source: 'dispatcher-queue',
          limit: String(conversionData.length),
        },
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        return await this.handleErrorResponse(response)
      }

      // eslint-disable-next-line no-console
      console.log(`Image conversion workflow triggered successfully for batch: ${batchId}`)
      return Ok(undefined)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Err(new Error(`Image conversion workflow trigger failed: ${errorMessage}`))
    }
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
          Authorization: `Bearer ${this.githubToken}`,
          'User-Agent': 'pawmatch-dispatcher/1.0.0',
        },
      })

      if (!response.ok) {
        return Err(new Error(`Failed to check workflow status: ${response.status}`))
      }

      const data = (await response.json()) as unknown as { status?: string }
      return Ok(data.status || 'unknown')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return Err(new Error(`Failed to check workflow status: ${errorMessage}`))
    }
  }
}
