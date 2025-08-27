/**
 * データ整合性チェックサービス
 * 
 * データベースとストレージ間の整合性確認に特化
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { ImageStatusService } from './ImageStatusService';

interface IntegrityCheckResult {
  checkedCount: number;
  updatedCount: number;
  discrepancies: {
    petId: string;
    dbHasJpeg: boolean;
    dbHasWebp: boolean;
    actualHasJpeg: boolean;
    actualHasWebp: boolean;
  }[];
  timestamp: string;
}

export class IntegrityCheckService {
  private imageStatusService: ImageStatusService;

  constructor(
    private readonly db: D1Database,
    private readonly r2: R2Bucket
  ) {
    this.imageStatusService = new ImageStatusService(db);
  }

  /**
   * データ整合性チェックを実行
   */
  async runIntegrityCheck(limit?: number): Promise<IntegrityCheckResult> {
    console.log('Running data integrity check...');
    
    // データベース内のペットを取得
    let query = `
      SELECT id, type, has_jpeg, has_webp, image_checked_at
      FROM pets
    `;
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    const pets = await this.db.prepare(query).all<{
      id: string;
      type: string;
      has_jpeg: number;
      has_webp: number;
      image_checked_at: string | null;
    }>();

    const discrepancies: IntegrityCheckResult['discrepancies'] = [];
    let checkedCount = 0;

    for (const pet of pets.results || []) {
      const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
      const webpKey = `pets/${pet.type}s/${pet.id}/optimized.webp`;

      const [jpegExists, webpExists] = await Promise.all([
        this.r2.head(jpegKey),
        this.r2.head(webpKey)
      ]);

      const actualHasJpeg = !!jpegExists;
      const actualHasWebp = !!webpExists;
      const dbHasJpeg = pet.has_jpeg === 1;
      const dbHasWebp = pet.has_webp === 1;

      // データベースと実際の状態が違う場合
      if (dbHasJpeg !== actualHasJpeg || dbHasWebp !== actualHasWebp) {
        discrepancies.push({
          petId: pet.id,
          dbHasJpeg,
          dbHasWebp,
          actualHasJpeg,
          actualHasWebp
        });

        // 自動修正
        await this.imageStatusService.updatePetImageStatus(
          pet.id,
          actualHasJpeg,
          actualHasWebp
        );
      }
      
      checkedCount++;
    }

    console.log(`Integrity check completed: ${checkedCount} pets checked, ${discrepancies.length} updated`);
    
    return {
      checkedCount,
      updatedCount: discrepancies.length,
      discrepancies,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 特定のペットの整合性チェック
   */
  async checkPetIntegrity(petId: string): Promise<{
    isConsistent: boolean;
    dbState: { hasJpeg: boolean; hasWebp: boolean };
    actualState: { hasJpeg: boolean; hasWebp: boolean };
  }> {
    const pet = await this.db
      .prepare('SELECT type, has_jpeg, has_webp FROM pets WHERE id = ?')
      .bind(petId)
      .first<{ type: string; has_jpeg: number; has_webp: number }>();

    if (!pet) {
      throw new Error(`Pet not found: ${petId}`);
    }

    const jpegKey = `pets/${pet.type}s/${petId}/original.jpg`;
    const webpKey = `pets/${pet.type}s/${petId}/optimized.webp`;

    const [jpegExists, webpExists] = await Promise.all([
      this.r2.head(jpegKey),
      this.r2.head(webpKey)
    ]);

    const dbState = {
      hasJpeg: pet.has_jpeg === 1,
      hasWebp: pet.has_webp === 1
    };

    const actualState = {
      hasJpeg: !!jpegExists,
      hasWebp: !!webpExists
    };

    return {
      isConsistent: dbState.hasJpeg === actualState.hasJpeg && 
                   dbState.hasWebp === actualState.hasWebp,
      dbState,
      actualState
    };
  }

  /**
   * 孤立した画像（DBにないがR2に存在）を検出
   */
  async findOrphanedImages(): Promise<string[]> {
    const orphaned: string[] = [];
    
    // R2から全オブジェクトをリスト
    const objects = await this.r2.list({ prefix: 'pets/' });
    
    for (const object of objects.objects) {
      // キーからペットIDを抽出
      const match = object.key.match(/pets\/(dog|cat)s\/([^/]+)\//);
      if (match) {
        const petId = match[2];
        const petType = match[1];
        
        // DBに存在するか確認
        const exists = await this.db
          .prepare('SELECT 1 FROM pets WHERE id = ? AND type = ?')
          .bind(petId, petType)
          .first();
        
        if (!exists) {
          orphaned.push(object.key);
        }
      }
    }
    
    return orphaned;
  }
}