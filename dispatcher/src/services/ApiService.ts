/**
 * API通信を管理するサービス
 */

import type { Env, Pet } from '../types'
import { Result, Ok, Err } from '../types/result'
import { ApiPetData, isApiStatsResponse, isApiPetData } from '../types/api'
import { ExternalServiceError, ErrorHandler } from '../../../shared/types/errors'

export class ApiService {
  private readonly apiUrl: string
  private readonly apiKey: string | undefined

  constructor(env: Env) {
    // 新しいプレフィックス付き環境変数を優先、旧名にフォールバック
    this.apiUrl = env.PAWMATCH_API_URL || env.API_URL || 'https://pawmatch-api.elchika.app'
    this.apiKey = env.PAWMATCH_API_KEY || env.PUBLIC_API_KEY || env.API_KEY || undefined
  }

  /**
   * 画像がないペットを取得（API経由でのみ取得）
   */
  async fetchPetsWithoutImages(limit = 30): Promise<Result<Pet[]>> {
    try {
      // API経由でデータ取得（D1とR2は使用しない）
      const response = await this.makeApiRequest('/api/stats')

      if (!response.ok) {
        const error = new ExternalServiceError(
          'PawMatch API',
          `Request failed with status: ${response.status}`,
          { status: response.status, statusText: response.statusText }
        )
        return Err(error)
      }

      // レスポンスをJSONとしてパース
      const data = (await response.json()) as any

      // 型検証
      if (!isApiStatsResponse(data)) {
        const error = new ExternalServiceError(
          'PawMatch API',
          'Invalid API response structure',
          data
        )
        return Err(error)
      }

      if (!data.success) {
        const error = new ExternalServiceError(
          'PawMatch API',
          data.error || 'API request was not successful',
          data
        )
        return Err(error)
      }

      if (!data.data?.missingImages) {
        return Ok([]) // データがない場合は空配列を返す
      }

      // ペットデータを変換
      const pets = this.convertApiPetsToPets(data.data.missingImages, limit)
      return Ok(pets)
    } catch (error) {
      const wrappedError = ErrorHandler.wrap(error, 'Failed to fetch pets')
      ErrorHandler.log(wrappedError, { limit, apiUrl: this.apiUrl })
      return Err(wrappedError)
    }
  }

  /**
   * APIリクエストを実行
   */
  private async makeApiRequest(endpoint: string): Promise<Response> {
    const url = `${this.apiUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildApiHeaders(),
      })
      return response
    } catch (error) {
      throw new ExternalServiceError('PawMatch API', `Failed to connect to API at ${url}`, error)
    }
  }

  /**
   * APIヘッダーを構築
   */
  private buildApiHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }

    return headers
  }

  /**
   * APIのペットデータをPet型に変換
   */
  private convertApiPetsToPets(apiPets: ApiPetData[], limit: number): Pet[] {
    const records: Pet[] = []
    const petsToProcess = apiPets.slice(0, limit)

    for (const apiPet of petsToProcess) {
      if (isApiPetData(apiPet)) {
        records.push(this.convertApiPetToPet(apiPet))
      } else {
        // 無効なペットデータはスキップ
      }
    }

    return records
  }

  /**
   * 単一のAPIペットデータをPet型に変換
   * 注: 最小限のフィールドのみ設定（スクリーンショット処理に必要な情報）
   */
  private convertApiPetToPet(apiPet: ApiPetData): Pet {
    const now = new Date().toISOString()
    // 統一されたPet型に合わせて設定
    return {
      id: apiPet.id,
      type: apiPet.type as 'dog' | 'cat',
      name: apiPet.name,
      breed: null,
      age: null,
      gender: 'unknown' as const,
      size: null,
      weight: null,
      color: null,
      description: null,
      location: null,
      prefecture: null,
      city: null,
      medicalInfo: null,
      vaccinationStatus: null,
      isNeutered: 0,
      personality: null,
      goodWithKids: 0,
      goodWithDogs: 0,
      goodWithCats: 0,
      adoptionFee: 0,
      shelterName: null,
      shelterContact: null,
      sourceUrl: apiPet.sourceUrl,
      sourceId: 'pet-home',
      careRequirements: null,
      isVaccinated: 0,
      isFivFelvTested: 0,
      apartmentFriendly: 0,
      needsYard: 0,
      hasJpeg: 0,
      hasWebp: 0,
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * JPEG画像を持つペットを取得（WebP変換対象）
   */
  async fetchPetsForConversion(limit = 50): Promise<Result<Pet[]>> {
    try {
      const response = await this.makeApiRequest('/api/pets?hasJpeg=true&hasWebp=false')

      if (!response.ok) {
        const error = new ExternalServiceError(
          'PawMatch API',
          `Request failed with status: ${response.status}`,
          { status: response.status, statusText: response.statusText }
        )
        return Err(error)
      }

      const data = (await response.json()) as any

      if (!data.success || !Array.isArray(data.data)) {
        const error = new ExternalServiceError(
          'PawMatch API',
          'Invalid API response for conversion pets',
          data
        )
        return Err(error)
      }

      const pets = (data.data as any[])
        .slice(0, limit)
        .map((apiPet: any) => this.convertApiPetToPet(apiPet))
      return Ok(pets)
    } catch (error) {
      const wrappedError = ErrorHandler.wrap(error, 'Failed to fetch pets for conversion')
      ErrorHandler.log(wrappedError, { limit, apiUrl: this.apiUrl })
      return Err(wrappedError)
    }
  }

  /**
   * ペットのステータスを更新
   */
  async updateStatus(petIds: string[], status: string): Promise<Result<void>> {
    try {
      const response = await fetch(`${this.apiUrl}/api/pets/update-status`, {
        method: 'POST',
        headers: this.buildApiHeaders(),
        body: JSON.stringify({
          petIds,
          status,
        }),
      })

      if (!response.ok) {
        const error = new ExternalServiceError(
          'PawMatch API',
          `Status update failed with status: ${response.status}`,
          { status: response.status, statusText: response.statusText }
        )
        return Err(error)
      }

      return Ok(undefined)
    } catch (error) {
      const wrappedError = ErrorHandler.wrap(error, 'Failed to update pet status')
      ErrorHandler.log(wrappedError, { petIds, status })
      return Err(wrappedError)
    }
  }

  /**
   * ディスパッチ履歴を記録（将来の実装用）
   */
  async recordDispatchHistory(
    _batchId: string,
    _petCount: number,
    _status: string
  ): Promise<Result<void>> {
    // TODO: 履歴記録APIが実装されたら追加
    // 今後実装予定
    return Ok(undefined)
  }
}
