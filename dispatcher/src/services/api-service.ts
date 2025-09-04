/**
 * API通信を管理するサービス
 */

import type { Env, PetRecord } from '../types';
import { Result, Ok, Err } from '../types/result';
import { ApiPetData, isApiStatsResponse, isApiPetData } from '../types/api';

export class ApiService {
  private readonly apiUrl: string;
  private readonly apiKey: string | undefined;

  constructor(env: Env) {
    this.apiUrl = env.API_URL || 'https://pawmatch-api.elchika.app';
    this.apiKey = env.API_KEY || undefined;
  }

  /**
   * 画像がないペットを取得
   */
  async fetchPetsWithoutImages(limit = 30): Promise<Result<PetRecord[]>> {
    try {
      // APIリクエストを実行
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
   */
  private convertApiPetToPetRecord(apiPet: ApiPetData): PetRecord {
    return {
      id: apiPet.id,
      type: apiPet.type,
      name: apiPet.name,
      sourceUrl: apiPet.sourceUrl,
      hasJpeg: apiPet.hasJpeg ? 1 : 0,
      hasWebp: apiPet.hasWebp ? 1 : 0
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