/**
 * データ整合性チェッククラス
 * 
 * データベースとR2ストレージ間の整合性チェックに特化
 */
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { IntegrityCheckResult } from './types';

export class IntegrityChecker {
  constructor(
    private readonly db: D1Database,
    private readonly r2?: R2Bucket
  ) {}

  /**
   * データ整合性チェック
   */
  async checkDataIntegrity(autoFix: boolean = false): Promise<IntegrityCheckResult> {
    const errors: string[] = [];
    let fixedCount = 0;

    // ペット総数を取得
    const totalPets = await this.getTotalPetsCount();

    // 画像存在チェック
    const imageCheckResult = await this.checkImageIntegrity();
    
    // 不整合を検出
    const mismatchedJpeg = imageCheckResult.mismatchedJpeg.length;
    const mismatchedWebp = imageCheckResult.mismatchedWebp.length;
    const isConsistent = mismatchedJpeg === 0 && mismatchedWebp === 0;

    if (!isConsistent && autoFix) {
      fixedCount = await this.fixIntegrityIssues(imageCheckResult);
    }

    // エラーメッセージを生成
    if (mismatchedJpeg > 0) {
      errors.push(`${mismatchedJpeg} pets have incorrect JPEG status`);
    }
    if (mismatchedWebp > 0) {
      errors.push(`${mismatchedWebp} pets have incorrect WebP status`);
    }

    return {
      isConsistent,
      totalPets,
      mismatchedJpeg,
      mismatchedWebp,
      fixedCount,
      errors
    };
  }

  /**
   * 画像整合性チェック
   */
  async checkImageIntegrity(): Promise<{
    mismatchedJpeg: string[];
    mismatchedWebp: string[];
  }> {
    if (!this.r2) {
      return {
        mismatchedJpeg: [],
        mismatchedWebp: []
      };
    }

    const mismatchedJpeg: string[] = [];
    const mismatchedWebp: string[] = [];

    // データベースからペット情報を取得
    const pets = await this.getAllPets();

    for (const pet of pets) {
      // JPEGチェック
      if (pet.has_jpeg) {
        const jpegExists = await this.checkImageExists(
          `pets/${pet.type}s/${pet.id}/original.jpg`
        );
        if (!jpegExists) {
          mismatchedJpeg.push(pet.id);
        }
      }

      // WebPチェック
      if (pet.has_webp) {
        const webpExists = await this.checkImageExists(
          `pets/${pet.type}s/${pet.id}/optimized.webp`
        );
        if (!webpExists) {
          mismatchedWebp.push(pet.id);
        }
      }
    }

    return {
      mismatchedJpeg,
      mismatchedWebp
    };
  }

  /**
   * データベースの整合性チェック
   */
  async checkDatabaseIntegrity(): Promise<{
    duplicates: string[];
    orphanedImages: string[];
    missingRequired: string[];
  }> {
    const duplicates = await this.findDuplicatePets();
    const orphanedImages = await this.findOrphanedImages();
    const missingRequired = await this.findPetsWithMissingFields();

    return {
      duplicates,
      orphanedImages,
      missingRequired
    };
  }

  /**
   * 整合性問題を修正
   */
  private async fixIntegrityIssues(issues: {
    mismatchedJpeg: string[];
    mismatchedWebp: string[];
  }): Promise<number> {
    let fixedCount = 0;

    // JPEG状態を修正
    for (const petId of issues.mismatchedJpeg) {
      await this.updatePetImageStatus(petId, 'jpeg', false);
      fixedCount++;
    }

    // WebP状態を修正
    for (const petId of issues.mismatchedWebp) {
      await this.updatePetImageStatus(petId, 'webp', false);
      fixedCount++;
    }

    return fixedCount;
  }

  /**
   * 画像の存在チェック
   */
  private async checkImageExists(key: string): Promise<boolean> {
    if (!this.r2) return false;
    
    try {
      const object = await this.r2.head(key);
      return object !== null;
    } catch {
      return false;
    }
  }

  /**
   * ペット画像ステータスを更新
   */
  private async updatePetImageStatus(
    petId: string,
    imageType: 'jpeg' | 'webp',
    status: boolean
  ): Promise<void> {
    const column = imageType === 'jpeg' ? 'has_jpeg' : 'has_webp';
    const query = `
      UPDATE pets 
      SET ${column} = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    
    await this.db.prepare(query).bind(status ? 1 : 0, petId).run();
  }

  /**
   * 全ペットを取得
   */
  private async getAllPets(): Promise<any[]> {
    const query = `
      SELECT id, type, has_jpeg, has_webp 
      FROM pets 
      ORDER BY created_at DESC
    `;
    const result = await this.db.prepare(query).all();
    return result.results;
  }

  /**
   * ペット総数を取得
   */
  private async getTotalPetsCount(): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM pets`;
    const result = await this.db.prepare(query).first();
    return result?.count as number || 0;
  }

  /**
   * 重複ペットを検出
   */
  private async findDuplicatePets(): Promise<string[]> {
    const query = `
      SELECT source_url, COUNT(*) as count
      FROM pets
      GROUP BY source_url
      HAVING count > 1
    `;
    const result = await this.db.prepare(query).all();
    return result.results.map(row => row.source_url as string);
  }

  /**
   * 孤立した画像を検出
   */
  private async findOrphanedImages(): Promise<string[]> {
    if (!this.r2) return [];
    
    // R2の全オブジェクトをリスト
    const objects = await this.r2.list();
    const orphaned: string[] = [];
    
    for (const object of objects.objects) {
      // ペットIDを抽出
      const match = object.key.match(/pets\/(dogs|cats)\/([^/]+)\//);
      if (match) {
        const petId = match[2];
        
        // データベースに存在するかチェック
        const query = `SELECT id FROM pets WHERE id = ?`;
        const result = await this.db.prepare(query).bind(petId).first();
        
        if (!result) {
          orphaned.push(object.key);
        }
      }
    }
    
    return orphaned;
  }

  /**
   * 必須フィールドが欠落したペットを検出
   */
  private async findPetsWithMissingFields(): Promise<string[]> {
    const query = `
      SELECT id
      FROM pets
      WHERE name IS NULL 
        OR name = ''
        OR prefecture IS NULL 
        OR prefecture = ''
        OR source_url IS NULL 
        OR source_url = ''
    `;
    const result = await this.db.prepare(query).all();
    return result.results.map(row => row.id as string);
  }
}