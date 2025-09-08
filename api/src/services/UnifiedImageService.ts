/**
 * 統合画像管理サービス
 *
 * ImageManagementFacadeとその4つのサービスを単一のシンプルなサービスに統合
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

export interface ImageStatus {
  petId: string
  hasJpeg: boolean
  hasWebp: boolean
  jpegUrl?: string
  webpUrl?: string
  lastChecked: string
}

export interface ImageStatistics {
  totalPets: number
  petsWithJpeg: number
  petsWithWebp: number
  petsWithBoth: number
  coverage: {
    jpeg: number
    webp: number
    both: number
  }
}

export class UnifiedImageService {
  constructor(
    private readonly db: D1Database,
    private readonly r2: R2Bucket
  ) {}

  /**
   * ペットの画像ステータスを取得
   */
  async getImageStatus(petId: string): Promise<ImageStatus | null> {
    const pet = await this.db.prepare('SELECT * FROM pets WHERE id = ?').bind(petId).first()

    if (!pet) return null

    const jpegKey = `images/${petId}.jpg`
    const webpKey = `images/${petId}.webp`

    const [jpegInfo, webpInfo] = await Promise.all([this.r2.head(jpegKey), this.r2.head(webpKey)])

    return {
      petId,
      hasJpeg: !!jpegInfo,
      hasWebp: !!webpInfo,
      jpegUrl: jpegInfo ? `/api/images/${petId}.jpg` : undefined,
      webpUrl: webpInfo ? `/api/images/${petId}.webp` : undefined,
      lastChecked: new Date().toISOString(),
    }
  }

  /**
   * 画像をアップロード
   */
  async uploadImage(
    petId: string,
    data: ArrayBuffer,
    format: 'jpeg' | 'webp' = 'jpeg'
  ): Promise<void> {
    const key = `images/${petId}.${format === 'jpeg' ? 'jpg' : 'webp'}`
    await this.r2.put(key, data)

    // DBを更新
    const column = format === 'jpeg' ? 'has_jpeg' : 'has_webp'
    await this.db
      .prepare(`UPDATE pets SET ${column} = 1, image_checked_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), petId)
      .run()
  }

  /**
   * 画像を取得
   */
  async getImage(petId: string, format: 'jpeg' | 'webp' = 'jpeg'): Promise<ArrayBuffer | null> {
    const key = `images/${petId}.${format === 'jpeg' ? 'jpg' : 'webp'}`
    const object = await this.r2.get(key)

    if (!object) return null

    return await object.arrayBuffer()
  }

  /**
   * 画像を削除
   */
  async deleteImage(petId: string, format?: 'jpeg' | 'webp'): Promise<void> {
    const keys = format
      ? [`images/${petId}.${format === 'jpeg' ? 'jpg' : 'webp'}`]
      : [`images/${petId}.jpg`, `images/${petId}.webp`]

    await Promise.all(keys.map((key) => this.r2.delete(key)))

    // DBを更新
    if (format) {
      const column = format === 'jpeg' ? 'has_jpeg' : 'has_webp'
      await this.db.prepare(`UPDATE pets SET ${column} = 0 WHERE id = ?`).bind(petId).run()
    } else {
      await this.db
        .prepare('UPDATE pets SET has_jpeg = 0, has_webp = 0 WHERE id = ?')
        .bind(petId)
        .run()
    }
  }

  /**
   * 画像統計を取得
   */
  async getStatistics(): Promise<ImageStatistics> {
    const stats = await this.db
      .prepare(
        `
        SELECT 
          COUNT(*) as total_pets,
          SUM(CASE WHEN has_jpeg = 1 THEN 1 ELSE 0 END) as pets_with_jpeg,
          SUM(CASE WHEN has_webp = 1 THEN 1 ELSE 0 END) as pets_with_webp,
          SUM(CASE WHEN has_jpeg = 1 AND has_webp = 1 THEN 1 ELSE 0 END) as pets_with_both
        FROM pets
      `
      )
      .first<{
        total_pets: number
        pets_with_jpeg: number
        pets_with_webp: number
        pets_with_both: number
      }>()

    if (!stats) {
      return {
        totalPets: 0,
        petsWithJpeg: 0,
        petsWithWebp: 0,
        petsWithBoth: 0,
        coverage: { jpeg: 0, webp: 0, both: 0 },
      }
    }

    const total = stats.total_pets || 0
    return {
      totalPets: total,
      petsWithJpeg: stats.pets_with_jpeg || 0,
      petsWithWebp: stats.pets_with_webp || 0,
      petsWithBoth: stats.pets_with_both || 0,
      coverage: {
        jpeg: total > 0 ? (stats.pets_with_jpeg / total) * 100 : 0,
        webp: total > 0 ? (stats.pets_with_webp / total) * 100 : 0,
        both: total > 0 ? (stats.pets_with_both / total) * 100 : 0,
      },
    }
  }

  /**
   * 画像のないペットを検索
   */
  async findPetsWithoutImages(limit: number = 100): Promise<Array<{ id: string; name: string }>> {
    const result = await this.db
      .prepare(
        `
        SELECT id, name 
        FROM pets 
        WHERE has_jpeg = 0 OR has_webp = 0
        LIMIT ?
      `
      )
      .bind(limit)
      .all()

    return result.results as Array<{ id: string; name: string }>
  }

  /**
   * バッチで画像ステータスを更新
   */
  async batchUpdateImageStatus(petIds: string[]): Promise<void> {
    for (const petId of petIds) {
      const status = await this.getImageStatus(petId)
      if (status) {
        await this.db
          .prepare(
            `
            UPDATE pets 
            SET has_jpeg = ?, has_webp = ?, image_checked_at = ?
            WHERE id = ?
          `
          )
          .bind(status.hasJpeg ? 1 : 0, status.hasWebp ? 1 : 0, new Date().toISOString(), petId)
          .run()
      }
    }
  }
}
