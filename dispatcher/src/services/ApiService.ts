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
   * 画像がないペット（Screenshot不足）を取得 - 犬用
   */
  async fetchDogsWithoutScreenshots(limit = 30, sourceId = 'pet-home'): Promise<Result<Pet[]>> {
    try {
      const response = await this.makeApiRequest(
        `/api/stats/dogs/missing-screenshots?limit=${limit}&sourceId=${sourceId}`
      )

      if (!response.ok) {
        const error = new ExternalServiceError(
          'PawMatch API',
          `Request failed with status: ${response.status}`,
          { status: response.status, statusText: response.statusText }
        )
        return Err(error)
      }

      // レスポンスをJSONとしてパース
      const data = (await response.json()) as unknown

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

      // 新しいエンドポイントのレスポンス形式に対応
      const petData = data.data?.pets || data.data?.missingImages
      if (!petData) {
        return Ok([]) // データがない場合は空配列を返す
      }

      // ペットデータを変換
      const pets = this.convertApiPetsToPets(petData, limit)
      return Ok(pets)
    } catch (error) {
      const wrappedError = ErrorHandler.wrap(error, 'Failed to fetch dogs without screenshots')
      ErrorHandler.log(wrappedError, { limit, apiUrl: this.apiUrl })
      return Err(wrappedError)
    }
  }

  /**
   * 画像がないペット（Screenshot不足）を取得 - 猫用
   */
  async fetchCatsWithoutScreenshots(limit = 30, sourceId = 'pet-home'): Promise<Result<Pet[]>> {
    try {
      const response = await this.makeApiRequest(
        `/api/stats/cats/missing-screenshots?limit=${limit}&sourceId=${sourceId}`
      )

      if (!response.ok) {
        const error = new ExternalServiceError(
          'PawMatch API',
          `Request failed with status: ${response.status}`,
          { status: response.status, statusText: response.statusText }
        )
        return Err(error)
      }

      // レスポンスをJSONとしてパース
      const data = (await response.json()) as unknown

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

      // 新しいエンドポイントのレスポンス形式に対応
      const petData = data.data?.pets || data.data?.missingImages
      if (!petData) {
        return Ok([]) // データがない場合は空配列を返す
      }

      // ペットデータを変換
      const pets = this.convertApiPetsToPets(petData, limit)
      return Ok(pets)
    } catch (error) {
      const wrappedError = ErrorHandler.wrap(error, 'Failed to fetch cats without screenshots')
      ErrorHandler.log(wrappedError, { limit, apiUrl: this.apiUrl })
      return Err(wrappedError)
    }
  }

  /**
   * 画像がないペット（Conversion不足）を取得 - 犬用
   */
  async fetchDogsWithoutConversions(limit = 30, sourceId = 'pet-home'): Promise<Result<Pet[]>> {
    try {
      const response = await this.makeApiRequest(
        `/api/stats/dogs/missing-conversions?limit=${limit}&sourceId=${sourceId}`
      )

      if (!response.ok) {
        const error = new ExternalServiceError(
          'PawMatch API',
          `Request failed with status: ${response.status}`,
          { status: response.status, statusText: response.statusText }
        )
        return Err(error)
      }

      // レスポンスをJSONとしてパース
      const data = (await response.json()) as unknown

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

      // 新しいエンドポイントのレスポンス形式に対応
      const petData = data.data?.pets || data.data?.missingImages
      if (!petData) {
        return Ok([]) // データがない場合は空配列を返す
      }

      // ペットデータを変換
      const pets = this.convertApiPetsToPets(petData, limit)
      return Ok(pets)
    } catch (error) {
      const wrappedError = ErrorHandler.wrap(error, 'Failed to fetch dogs without conversions')
      ErrorHandler.log(wrappedError, { limit, apiUrl: this.apiUrl })
      return Err(wrappedError)
    }
  }

  /**
   * 画像がないペット（Conversion不足）を取得 - 猫用
   */
  async fetchCatsWithoutConversions(limit = 30, sourceId = 'pet-home'): Promise<Result<Pet[]>> {
    try {
      const response = await this.makeApiRequest(
        `/api/stats/cats/missing-conversions?limit=${limit}&sourceId=${sourceId}`
      )

      if (!response.ok) {
        const error = new ExternalServiceError(
          'PawMatch API',
          `Request failed with status: ${response.status}`,
          { status: response.status, statusText: response.statusText }
        )
        return Err(error)
      }

      // レスポンスをJSONとしてパース
      const data = (await response.json()) as unknown

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

      // 新しいエンドポイントのレスポンス形式に対応
      const petData = data.data?.pets || data.data?.missingImages
      if (!petData) {
        return Ok([]) // データがない場合は空配列を返す
      }

      // ペットデータを変換
      const pets = this.convertApiPetsToPets(petData, limit)
      return Ok(pets)
    } catch (error) {
      const wrappedError = ErrorHandler.wrap(error, 'Failed to fetch cats without conversions')
      ErrorHandler.log(wrappedError, { limit, apiUrl: this.apiUrl })
      return Err(wrappedError)
    }
  }

  /**
   * 画像がないペットを取得（API経由でのみ取得） - 旧メソッド（後方互換性のため残す）
   */
  async fetchPetsWithoutImages(limit = 30, sourceId = 'pet-home'): Promise<Result<Pet[]>> {
    // 両方のペットを取得して結合
    const [dogsResult, catsResult] = await Promise.all([
      this.fetchDogsWithoutScreenshots(limit / 2, sourceId),
      this.fetchCatsWithoutScreenshots(limit / 2, sourceId),
    ])

    if (Result.isFailure(dogsResult) && Result.isFailure(catsResult)) {
      return dogsResult // エラーを返す
    }

    const pets = [
      ...(Result.isSuccess(dogsResult) ? dogsResult.data : []),
      ...(Result.isSuccess(catsResult) ? catsResult.data : []),
    ]

    return Ok(pets)
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

      const data = (await response.json()) as unknown
      const typedData = data as { success?: boolean; data?: unknown }

      if (!typedData.success || !Array.isArray(typedData.data)) {
        const error = new ExternalServiceError(
          'PawMatch API',
          'Invalid API response for conversion pets',
          typedData
        )
        return Err(error)
      }

      const pets = (typedData.data as unknown[])
        .slice(0, limit)
        .map((apiPet: unknown) => this.convertApiPetToPet(apiPet as ApiPetData))
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
