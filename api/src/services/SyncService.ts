/**
 * 同期サービス
 *
 * シンプルな2層構造：
 * - SyncService → SyncJob
 */

import type { D1Database } from '@cloudflare/workers-types'

export interface SyncJob {
  id: string
  petType?: 'dog' | 'cat'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  total: number
  errors: string[]
  startedAt: string
  completedAt?: string
}

export interface SyncResult {
  success: boolean
  jobId: string
  synced: number
  failed: number
  errors: string[]
}

export class SyncService {
  private activeJobs = new Map<string, SyncJob>()

  constructor(private readonly db: D1Database) {}

  /**
   * 同期ジョブを開始
   */
  async startSync(petType?: 'dog' | 'cat'): Promise<SyncJob> {
    const jobId = `sync_${Date.now()}`
    const job: SyncJob = {
      id: jobId,
      petType: petType || undefined,
      status: 'running',
      progress: 0,
      total: 0,
      errors: [],
      startedAt: new Date().toISOString(),
    }

    this.activeJobs.set(jobId, job)

    // 非同期で同期を実行
    this.executeSyncJob(job).catch((error) => {
      job.status = 'failed'
      job.errors.push(error.message)
    })

    return job
  }

  /**
   * 同期ジョブを実行
   */
  private async executeSyncJob(job: SyncJob): Promise<void> {
    try {
      // ペットを取得
      const whereClause = job.petType ? `WHERE type = '${job.petType}'` : ''
      const result = await this.db.prepare(`SELECT * FROM pets ${whereClause}`).all()

      const pets = result.results || []
      job.total = pets.length

      // バッチで処理
      const batchSize = 10
      for (let i = 0; i < pets.length; i += batchSize) {
        const batch = pets.slice(i, i + batchSize)

        await Promise.all(
          batch.map(async (pet) => {
            try {
              await this.syncPet(pet)
              job.progress++
            } catch (error) {
              job.errors.push(
                `Failed to sync ${(pet as { id?: string })['id'] || 'unknown'}: ${error}`
              )
            }
          })
        )

        // 進捗を更新
        await this.updateJobProgress(job.id, job.progress, job.total)
      }

      job.status = 'completed'
      job.completedAt = new Date().toISOString()
    } catch (error) {
      job.status = 'failed'
      job.errors.push(error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * 単一ペットを同期
   */
  private async syncPet(pet: unknown): Promise<void> {
    const petData = pet as { id: string; [key: string]: unknown }

    // ここで実際の同期処理を実装
    // 例: 画像チェック、データ検証など
    await this.db
      .prepare('UPDATE pets SET lastSyncedAt = ? WHERE id = ?')
      .bind(new Date().toISOString(), petData.id)
      .run()
  }

  /**
   * ジョブの進捗を更新
   */
  private async updateJobProgress(jobId: string, progress: number, total: number): Promise<void> {
    // DBに進捗を保存（オプション）
    await this.db
      .prepare(
        `
        INSERT OR REPLACE INTO sync_jobs (id, progress, total, updatedAt)
        VALUES (?, ?, ?, ?)
      `
      )
      .bind(jobId, progress, total, new Date().toISOString())
      .run()
      .catch(() => {
        // テーブルがない場合は無視
      })
  }

  /**
   * ジョブのステータスを取得
   */
  async getJobStatus(jobId: string): Promise<SyncJob | null> {
    return this.activeJobs.get(jobId) || null
  }

  /**
   * アクティブなジョブを取得
   */
  async getActiveJobs(): Promise<SyncJob[]> {
    return Array.from(this.activeJobs.values()).filter((job) => job.status === 'running')
  }

  /**
   * データ整合性チェック
   */
  async checkIntegrity(): Promise<{
    valid: boolean
    issues: string[]
  }> {
    const issues: string[] = []

    // 画像なしペットをチェック
    const noImageResult = await this.db
      .prepare('SELECT COUNT(*) as count FROM pets WHERE hasJpeg = 0 AND hasWebp = 0')
      .first<{ count: number }>()

    if (noImageResult && noImageResult.count > 0) {
      issues.push(`${noImageResult.count} pets without images`)
    }

    // 重複IDチェック
    const duplicateResult = await this.db
      .prepare('SELECT id, COUNT(*) as count FROM pets GROUP BY id HAVING count > 1')
      .all()

    if (duplicateResult.results.length > 0) {
      issues.push(`${duplicateResult.results.length} duplicate pet IDs found`)
    }

    return {
      valid: issues.length === 0,
      issues,
    }
  }

  /**
   * 同期統計を取得
   */
  async getStatistics(): Promise<{
    totalSynced: number
    lastSyncTime?: string
    pendingSync: number
  }> {
    const stats = await this.db
      .prepare(
        `
        SELECT 
          COUNT(CASE WHEN lastSyncedAt IS NOT NULL THEN 1 END) as synced,
          MAX(lastSyncedAt) as lastSync,
          COUNT(CASE WHEN lastSyncedAt IS NULL THEN 1 END) as pending
        FROM pets
      `
      )
      .first<{
        synced: number
        lastSync: string
        pending: number
      }>()

    return {
      totalSynced: stats?.synced || 0,
      lastSyncTime: stats?.lastSync || undefined,
      pendingSync: stats?.pending || 0,
    }
  }
}
