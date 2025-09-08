import type { D1Database } from '@cloudflare/workers-types'

export interface CleanupResult {
  deletedCount: number
  softDeletedCount: number
  errors: string[]
}

export class CleanupService {
  constructor(private db: D1Database) {}

  async deleteExpiredPets(): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedCount: 0,
      softDeletedCount: 0,
      errors: [],
    }

    try {
      // ソフト削除から14日経過したデータを物理削除（期限切れから合計28日）
      const hardDeleteResult = await this.db
        .prepare(
          `
        DELETE FROM pets 
        WHERE is_deleted = TRUE
        AND deleted_at < datetime('now', '-14 days')
      `
        )
        .run()

      result.deletedCount = hardDeleteResult.meta.changes || 0
    } catch (error) {
      result.errors.push(
        `Hard delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    try {
      const softDeleteResult = await this.db
        .prepare(
          `
        UPDATE pets 
        SET 
          is_deleted = TRUE,
          deleted_at = datetime('now')
        WHERE 
          expires_at < datetime('now')
          AND is_deleted = FALSE
      `
        )
        .run()

      result.softDeletedCount = softDeleteResult.meta.changes || 0
    } catch (error) {
      result.errors.push(
        `Soft delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    return result
  }

  async getExpiredPetImages(): Promise<string[]> {
    try {
      const expiredPets = await this.db
        .prepare(
          `
        SELECT images 
        FROM pets 
        WHERE is_deleted = TRUE
        AND deleted_at < datetime('now', '-14 days')
      `
        )
        .all()

      const imageKeys: string[] = []

      for (const pet of expiredPets.results) {
        if (pet['images'] && typeof pet['images'] === 'string') {
          try {
            const images = JSON.parse(pet['images'])
            if (Array.isArray(images)) {
              imageKeys.push(...images)
            }
          } catch {
            continue
          }
        }
      }

      return imageKeys
    } catch (error) {
      console.error('Failed to get expired pet images:', error)
      return []
    }
  }

  async updateExpiredPetsWithDefaultTTL(days: number = 14): Promise<number> {
    try {
      const result = await this.db
        .prepare(
          `
        UPDATE pets 
        SET expires_at = datetime(created_at, '+${days} days')
        WHERE expires_at IS NULL
      `
        )
        .run()

      return result.meta.changes || 0
    } catch (error) {
      console.error('Failed to update pets with default TTL:', error)
      return 0
    }
  }

  async getCleanupStats(): Promise<{
    totalPets: number
    expiredPets: number
    deletedPets: number
    upcomingExpirations: number
  }> {
    const stats = {
      totalPets: 0,
      expiredPets: 0,
      deletedPets: 0,
      upcomingExpirations: 0,
    }

    try {
      const totalResult = await this.db
        .prepare(
          `
        SELECT COUNT(*) as count FROM pets WHERE is_deleted = FALSE
      `
        )
        .first()
      stats.totalPets = (totalResult?.['count'] as number) || 0

      const expiredResult = await this.db
        .prepare(
          `
        SELECT COUNT(*) as count FROM pets 
        WHERE expires_at < datetime('now') AND is_deleted = FALSE
      `
        )
        .first()
      stats.expiredPets = (expiredResult?.['count'] as number) || 0

      const deletedResult = await this.db
        .prepare(
          `
        SELECT COUNT(*) as count FROM pets WHERE is_deleted = TRUE
      `
        )
        .first()
      stats.deletedPets = (deletedResult?.['count'] as number) || 0

      const upcomingResult = await this.db
        .prepare(
          `
        SELECT COUNT(*) as count FROM pets 
        WHERE expires_at BETWEEN datetime('now') AND datetime('now', '+7 days')
        AND is_deleted = FALSE
      `
        )
        .first()
      stats.upcomingExpirations = (upcomingResult?.['count'] as number) || 0
    } catch (error) {
      console.error('Failed to get cleanup stats:', error)
    }

    return stats
  }
}
