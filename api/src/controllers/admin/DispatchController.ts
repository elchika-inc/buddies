import type { Context } from 'hono'
import type { Env } from '../../types'
import { PetDispatchService } from '../../services/PetDispatchService'
import { getDispatcherConfig } from '../../config/dispatcher'

export class DispatchController {
  constructor(private env: Env) {}

  /**
   * スクリーンショット処理のディスパッチ
   * APIでペット取得戦略を決定し、Dispatcherはメッセージリレーのみ行う
   */
  async triggerScreenshot(c: Context) {
    try {
      const { limit = 30, petType, petIds } = await c.req.json().catch(() => ({}))

      // Dispatcher サービスバインディングの確認
      if (!this.env.DISPATCHER) {
        return c.json(
          {
            success: false,
            error: 'Dispatcher service binding not configured',
          },
          500
        )
      }

      // API側でペット取得戦略を実行
      const petDispatchService = new PetDispatchService(this.env)
      const dispatchData = await petDispatchService.fetchPetsForDispatch({
        limit,
        petType,
        petIds,
      })

      if (dispatchData.pets.length === 0) {
        return c.json({
          success: true,
          message: 'No pets without screenshots found',
          count: 0,
        })
      }

      // ペットIDリストを準備
      const petsToDispatch = dispatchData.pets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        type: pet.type,
        sourceUrl: pet.sourceUrl || '',
      }))

      // Dispatcher設定を取得
      const dispatcherConfig = getDispatcherConfig()

      // Dispatcherにはペットデータと設定を渡す
      const dispatcherResponse = await this.env.DISPATCHER.fetch(
        new Request('https://dispatcher.internal/dispatch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Request': 'true',
          },
          body: JSON.stringify({
            pets: petsToDispatch,
            source: 'api',
            config: {
              limits: dispatcherConfig.defaults,
              queue: dispatcherConfig.queue,
            },
          }),
        })
      )

      if (!dispatcherResponse.ok) {
        const errorText = await dispatcherResponse.text()
        return c.json(
          {
            success: false,
            error: `Dispatcher trigger failed: ${errorText}`,
          },
          dispatcherResponse.status as 400 | 401 | 403 | 404 | 500 | 502 | 503
        )
      }

      const result = (await dispatcherResponse.json()) as { batchId?: string }

      // ペットのステータスを更新
      await petDispatchService.updatePetsStatus(
        dispatchData.pets.map((p) => p.id),
        'screenshot_dispatched'
      )

      return c.json({
        success: true,
        message: `Screenshot processing triggered for ${dispatchData.pets.length} pets`,
        data: {
          batchId: result.batchId || '',
          strategy: dispatchData.strategy,
          petCount: dispatchData.pets.length,
        },
      })
    } catch (error) {
      console.error('Error triggering screenshot dispatch:', error)
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  /**
   * スケジュール実行用エンドポイント
   * Cronから呼び出される
   */
  async triggerScheduled(c: Context) {
    try {
      if (!this.env.DISPATCHER) {
        return c.json(
          {
            success: false,
            error: 'Dispatcher service binding not configured',
          },
          500
        )
      }

      // API側でペットを取得（デフォルト: 30件の混合）
      const petDispatchService = new PetDispatchService(this.env)
      const dispatchData = await petDispatchService.fetchPetsForDispatch({
        limit: 30,
      })

      if (dispatchData.pets.length === 0) {
        return c.json({
          success: true,
          message: 'No pets without screenshots found',
          count: 0,
        })
      }

      const petsToDispatch = dispatchData.pets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        type: pet.type,
        sourceUrl: pet.sourceUrl || '',
      }))

      // Dispatcher設定を取得
      const dispatcherConfig = getDispatcherConfig()

      // Dispatcherに送信
      const dispatcherResponse = await this.env.DISPATCHER.fetch(
        new Request('https://dispatcher.internal/scheduled', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Request': 'true',
          },
          body: JSON.stringify({
            pets: petsToDispatch,
            source: 'cron',
            config: {
              limits: dispatcherConfig.defaults,
              queue: dispatcherConfig.queue,
            },
          }),
        })
      )

      if (!dispatcherResponse.ok) {
        const errorText = await dispatcherResponse.text()
        return c.json(
          {
            success: false,
            error: `Scheduled dispatch failed: ${errorText}`,
          },
          dispatcherResponse.status as 400 | 401 | 403 | 404 | 500 | 502 | 503
        )
      }

      const result = await dispatcherResponse.json()

      // ペットのステータスを更新
      await petDispatchService.updatePetsStatus(
        dispatchData.pets.map((p) => p.id),
        'screenshot_dispatched'
      )

      return c.json({
        success: true,
        message: `Scheduled processing triggered for ${dispatchData.pets.length} pets`,
        data: result,
      })
    } catch (error) {
      console.error('Error in scheduled dispatch:', error)
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }
}
