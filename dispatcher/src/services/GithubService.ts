/**
 * GitHub Actionsワークフローを起動するサービス
 * シンプルなワークフロー起動のみを担当
 */

import type { Env, ConversionData, PetDispatchData } from '../types'

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds`)
    this.name = 'RateLimitError'
  }
}

export class GitHubService {
  private readonly githubToken: string
  private readonly githubOwner: string
  private readonly githubRepo: string

  constructor(env: Env) {
    this.githubToken = env.PAWMATCH_GITHUB_TOKEN || env.GITHUB_TOKEN || ''
    this.githubOwner = env.PAWMATCH_GITHUB_OWNER || 'elchika-inc'
    this.githubRepo = env.PAWMATCH_GITHUB_REPO || 'pawmatch'
  }

  /**
   * スクリーンショットワークフローを起動
   * APIから渡された設定をそのまま使用
   */
  async triggerScreenshotWorkflow(
    pets: PetDispatchData[],
    batchId: string,
    workflowFile: string = 'screenshot-capture.yml'
  ): Promise<{ success: boolean; error?: Error }> {
    try {
      const url = this.buildWorkflowUrl(workflowFile)

      // ペットデータを変換
      const petsData = pets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        sourceUrl: pet.sourceUrl || '',
        type: pet.type,
      }))

      const payload = {
        ref: 'main',
        inputs: {
          batch_data: JSON.stringify(petsData),
          batch_id: batchId,
          limit: String(pets.length),
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
      console.log(`Screenshot workflow triggered successfully for batch: ${batchId}`)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * 画像変換ワークフローを起動
   * APIから渡された設定をそのまま使用
   */
  async triggerConversionWorkflow(
    conversionData: ConversionData[],
    batchId: string,
    workflowFile: string = 'image-conversion.yml'
  ): Promise<{ success: boolean; error?: Error }> {
    try {
      const url = this.buildWorkflowUrl(workflowFile)

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
      console.log(`Conversion workflow triggered successfully for batch: ${batchId}`)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * ワークフローAPIのURLを構築
   */
  private buildWorkflowUrl(workflowFile: string): string {
    return `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}/actions/workflows/${workflowFile}/dispatches`
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
   * エラーレスポンスを処理
   */
  private async handleErrorResponse(
    response: Response
  ): Promise<{ success: boolean; error: Error }> {
    let errorBody = ''
    try {
      errorBody = await response.text()
      console.error('GitHub API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      })
    } catch {
      console.error('Failed to read error response body')
    }

    // Rate Limitエラーの場合
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10)
      return { success: false, error: new RateLimitError(retryAfter) }
    }

    // その他のエラー
    return {
      success: false,
      error: new Error(`GitHub API error: ${response.status} ${response.statusText}. ${errorBody}`),
    }
  }
}
