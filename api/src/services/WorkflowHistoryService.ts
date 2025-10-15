/**
 * Workflow実行履歴管理サービス
 *
 * sync_statusテーブルを使用してGitHub Actionsワークフローの実行履歴を記録
 */

import type { D1Database } from '@cloudflare/workers-types'

export interface WorkflowMetadata {
  workflowFile?: string
  batchId?: string
  githubRunId?: number
  githubRunUrl?: string
  petCount?: number
  source?: string
  conversionMode?: string
  [key: string]: unknown
}

export interface WorkflowStats {
  totalRecords?: number
  processedRecords?: number
  failedRecords?: number
}

export interface WorkflowRecord {
  id: number
  syncType: string
  status: string
  totalRecords: number
  processedRecords: number
  failedRecords: number
  metadata: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export class WorkflowHistoryService {
  constructor(private readonly db: D1Database) {}

  /**
   * 新しいworkflowの開始を記録
   */
  async startWorkflow(syncType: string, metadata: WorkflowMetadata): Promise<number> {
    const result = await this.db
      .prepare(
        `
      INSERT INTO sync_status (syncType, status, metadata, startedAt)
      VALUES (?, 'running', ?, CURRENT_TIMESTAMP)
    `
      )
      .bind(syncType, JSON.stringify(metadata))
      .run()

    const workflowId = result.meta.last_row_id as number

    if (!workflowId) {
      throw new Error('Failed to create workflow record')
    }

    return workflowId
  }

  /**
   * workflowを完了として記録
   */
  async completeWorkflow(id: number, stats: WorkflowStats): Promise<void> {
    await this.db
      .prepare(
        `
      UPDATE sync_status SET
        status = 'completed',
        totalRecords = ?,
        processedRecords = ?,
        failedRecords = ?,
        completedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `
      )
      .bind(stats.totalRecords || 0, stats.processedRecords || 0, stats.failedRecords || 0, id)
      .run()
  }

  /**
   * workflowを失敗として記録
   */
  async failWorkflow(id: number, errorMessage: string): Promise<void> {
    // 既存のmetadataを取得
    const existing = await this.db
      .prepare('SELECT metadata FROM sync_status WHERE id = ?')
      .bind(id)
      .first<{ metadata: string | null }>()

    // metadataにエラーメッセージを追加
    let metadata: WorkflowMetadata = {}
    if (existing?.metadata) {
      try {
        metadata = JSON.parse(existing.metadata) as WorkflowMetadata
      } catch {
        // JSON解析失敗時は空オブジェクトを使用
      }
    }
    metadata.errorMessage = errorMessage

    await this.db
      .prepare(
        `
      UPDATE sync_status SET
        status = 'failed',
        metadata = ?,
        completedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `
      )
      .bind(JSON.stringify(metadata), id)
      .run()
  }

  /**
   * workflow実行履歴を取得
   */
  async getWorkflowHistory(limit: number = 10): Promise<WorkflowRecord[]> {
    const result = await this.db
      .prepare(
        `
      SELECT * FROM sync_status
      ORDER BY createdAt DESC
      LIMIT ?
    `
      )
      .bind(limit)
      .all<WorkflowRecord>()

    return result.results || []
  }

  /**
   * 特定のworkflowを取得
   */
  async getWorkflowById(id: number): Promise<WorkflowRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM sync_status WHERE id = ?')
      .bind(id)
      .first<WorkflowRecord>()

    return result || null
  }

  /**
   * syncTypeごとの統計を取得
   */
  async getStatsBySyncType(syncType: string): Promise<{
    total: number
    completed: number
    failed: number
    running: number
    avgProcessedRecords: number
  }> {
    const result = await this.db
      .prepare(
        `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        AVG(CASE WHEN status = 'completed' THEN processedRecords ELSE NULL END) as avgProcessedRecords
      FROM sync_status
      WHERE syncType = ?
    `
      )
      .bind(syncType)
      .first<{
        total: number
        completed: number
        failed: number
        running: number
        avgProcessedRecords: number | null
      }>()

    if (!result) {
      return {
        total: 0,
        completed: 0,
        failed: 0,
        running: 0,
        avgProcessedRecords: 0,
      }
    }

    return {
      total: result.total,
      completed: result.completed,
      failed: result.failed,
      running: result.running,
      avgProcessedRecords: result.avgProcessedRecords || 0,
    }
  }

  /**
   * 実行中のworkflowを取得
   */
  async getRunningWorkflows(): Promise<WorkflowRecord[]> {
    const result = await this.db
      .prepare(
        `
      SELECT * FROM sync_status
      WHERE status = 'running'
      ORDER BY createdAt DESC
    `
      )
      .all<WorkflowRecord>()

    return result.results || []
  }
}
