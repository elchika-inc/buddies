/**
 * API通信を管理するサービス
 */

import type { Env, Pet } from '../types'
import { Result, Ok, Err } from '../types/result'
import { ApiPetData, isApiStatsResponse, isApiPetData } from '../types/api'
import { drizzle } from 'drizzle-orm/d1'
import { eq, isNull, or } from 'drizzle-orm'
import { pets as petsTable } from '../../../database/schema/schema'

export class ApiService {
  private readonly apiUrl: string
  private readonly apiKey: string | undefined
  private readonly db: ReturnType<typeof drizzle> | undefined

  constructor(env: Env) {
    this.apiUrl = env.API_URL || 'https://pawmatch-api.elchika.app'
    this.apiKey = env.PUBLIC_API_KEY || env.API_KEY || undefined
    this.db = env.DB ? drizzle(env.DB) : undefined
  }

  /**
   * 画像がないペットを取得（D1データベースから直接取得）
   */
  async fetchPetsWithoutImages(limit = 30): Promise<Result<Pet[]>> {
    try {
      // D1データベースが使用可能な場合は直接クエリ
      if (this.db) {
        const petsWithoutImages = await this.db
          .select()
          .from(petsTable)
          .where(or(isNull(petsTable.images), eq(petsTable.images, '[]')))
          .limit(limit)

        return Ok(petsWithoutImages.map(this.dbRecordToPet))
      }

      // D1が使用できない場合はAPIにフォールバック
      const response = await this.makeApiRequest('/api/stats')

      if (!response.ok) {
        return Err(new Error(`API request failed with status: ${response.status}`))
      }

      // レスポンスをJSONとしてパース
      const data = await response.json()

      // 型検証
      if (!isApiStatsResponse(data)) {
        return Err(new Error('Invalid API response structure'))
      }

      if (!data.success) {
        return Err(new Error(data.error || 'API request was not successful'))
      }

      if (!data.data?.missingImages) {
        return Ok([]) // データがない場合は空配列を返す
      }

      // ペットデータを変換
      const pets = this.convertApiPetsToPets(data.data.missingImages, limit)
      return Ok(pets)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown API error'
      return Err(new Error(`Failed to fetch pets: ${errorMessage}`))
    }
  }

  /**
   * APIリクエストを実行
   */
  private async makeApiRequest(endpoint: string): Promise<Response> {
    const url = `${this.apiUrl}${endpoint}`

    return await fetch(url, {
      method: 'GET',
      headers: this.buildApiHeaders(),
    })
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
        console.warn('Invalid pet data skipped:', apiPet)
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
      age_group: null,
      gender: 'unknown' as const,
      size: null,
      weight: null,
      color: null,
      description: null,
      location: null,
      prefecture: null,
      city: null,
      status: 'available' as const,
      medical_info: null,
      vaccination_status: null,
      spayed_neutered: null,
      special_needs: null,
      personality_traits: null,
      good_with_kids: null,
      good_with_pets: null,
      adoption_fee: null,
      organization_id: null,
      organization_name: null,
      contact_email: null,
      contact_phone: null,
      posted_date: null,
      updated_date: null,
      source_url: apiPet.sourceUrl,
      external_id: null,
      care_requirements: null,
      images: [],
      video_url: null,
      tags: [],
      featured: false,
      views: 0,
      likes: 0,
      created_at: now,
      updated_at: now,
    }
  }

  /**
   * データベースレコードをPet型に変換
   */
  private dbRecordToPet(record: any): Pet {
    return {
      ...record,
      images: record.images ? JSON.parse(record.images) : [],
      tags: record.tags ? JSON.parse(record.tags) : [],
      personality_traits: record.personality_traits ? JSON.parse(record.personality_traits) : null,
      spayed_neutered: record.spayed_neutered === 1,
      good_with_kids: record.good_with_kids === 1,
      good_with_pets: record.good_with_pets === 1,
      featured: record.featured === 1,
    }
  }

  /**
   * ディスパッチ履歴を記録（将来の実装用）
   */
  async recordDispatchHistory(
    batchId: string,
    petCount: number,
    status: string
  ): Promise<Result<void>> {
    // TODO: 履歴記録APIが実装されたら追加
    console.log(`Dispatch history recorded: ${batchId}, count: ${petCount}, status: ${status}`)
    return Ok(undefined)
  }
}
