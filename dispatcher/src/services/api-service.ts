/**
 * API通信を管理するサービス
 */

import type { Env, PetRecord } from '../types';
import { Result, Ok, Err } from '../types/result';
import { ApiPetData, isApiStatsResponse, isApiPetData } from '../types/api';
import { drizzle } from 'drizzle-orm/d1';
import { eq, isNull, and, or } from 'drizzle-orm';
import { pets as petsTable } from '../../../database/schema/schema';

export class ApiService {
  private readonly apiUrl: string;
  private readonly apiKey: string | undefined;
  private readonly db: ReturnType<typeof drizzle> | undefined;

  constructor(env: Env) {
    this.apiUrl = env.API_URL || 'https://pawmatch-api.elchika.app';
    this.apiKey = env.PUBLIC_API_KEY || env.API_KEY || undefined;
    this.db = env.DB ? drizzle(env.DB) : undefined;
  }

  /**
   * 画像がないペットを取得（D1データベースから直接取得）
   */
  async fetchPetsWithoutImages(limit = 30): Promise<Result<PetRecord[]>> {
    try {
      // D1データベースが使用可能な場合は直接クエリ
      if (this.db) {
        const petsWithoutImages = await this.db
          .select()
          .from(petsTable)
          .where(
            and(
              or(
                isNull(petsTable.imageUrl),
                eq(petsTable.hasJpeg, 0),
                eq(petsTable.hasWebp, 0)
              ),
              isNull(petsTable.screenshotRequestedAt)
            )
          )
          .limit(limit);
        
        return Ok(petsWithoutImages as PetRecord[]);
      }

      // D1が使用できない場合はAPIにフォールバック
      const response = await this.makeApiRequest('/api/stats');
      
      if (!response.ok) {
        return Err(new Error(`API request failed with status: ${response.status}`));
      }

      // レスポンスをJSONとしてパース
      const data = await response.json();
      
      // 型検証
      if (!isApiStatsResponse(data)) {
        return Err(new Error('Invalid API response structure'));
      }

      if (!data.success) {
        return Err(new Error(data.error || 'API request was not successful'));
      }

      if (!data.data?.missingImages) {
        return Ok([]); // データがない場合は空配列を返す
      }

      // ペットデータを変換
      const pets = this.convertApiPetsToPetRecords(data.data.missingImages, limit);
      return Ok(pets);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown API error';
      return Err(new Error(`Failed to fetch pets: ${errorMessage}`));
    }
  }

  /**
   * APIリクエストを実行
   */
  private async makeApiRequest(endpoint: string): Promise<Response> {
    const url = `${this.apiUrl}${endpoint}`;
    
    return await fetch(url, {
      method: 'GET',
      headers: this.buildApiHeaders()
    });
  }

  /**
   * APIヘッダーを構築
   */
  private buildApiHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    return headers;
  }

  /**
   * APIのペットデータをPetRecord型に変換
   */
  private convertApiPetsToPetRecords(apiPets: ApiPetData[], limit: number): PetRecord[] {
    const records: PetRecord[] = [];
    const petsToProcess = apiPets.slice(0, limit);

    for (const apiPet of petsToProcess) {
      if (isApiPetData(apiPet)) {
        records.push(this.convertApiPetToPetRecord(apiPet));
      } else {
        console.warn('Invalid pet data skipped:', apiPet);
      }
    }

    return records;
  }

  /**
   * 単一のAPIペットデータをPetRecord型に変換
   * 注: 最小限のフィールドのみ設定（スクリーンショット処理に必要な情報）
   */
  private convertApiPetToPetRecord(apiPet: ApiPetData): PetRecord {
    // 必須フィールドと画像関連フィールドのみ設定
    return {
      id: apiPet.id,
      type: apiPet.type,
      name: apiPet.name,
      breed: null,
      age: null,
      gender: null,
      prefecture: null,
      city: null,
      location: null,
      description: null,
      personality: null,
      medical_info: null,
      care_requirements: null,
      good_with: null,
      health_notes: null,
      color: null,
      weight: null,
      size: null,
      coat_length: null,
      is_neutered: null,
      is_vaccinated: null,
      vaccination_status: null,
      is_fiv_felv_tested: null,
      exercise_level: null,
      training_level: null,
      social_level: null,
      indoor_outdoor: null,
      grooming_requirements: null,
      good_with_kids: null,
      good_with_dogs: null,
      good_with_cats: null,
      apartment_friendly: null,
      needs_yard: null,
      image_url: null,
      has_jpeg: apiPet.hasJpeg ? 1 : 0,
      has_webp: apiPet.hasWebp ? 1 : 0,
      image_checked_at: null,
      screenshot_requested_at: null,
      screenshot_completed_at: null,
      shelter_name: null,
      shelter_contact: null,
      source_url: apiPet.sourceUrl,
      source_id: null,
      adoption_fee: null,
      created_at: null,
      updated_at: null,
    };
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
    console.log(`Dispatch history recorded: ${batchId}, count: ${petCount}, status: ${status}`);
    return Ok(undefined);
  }
}