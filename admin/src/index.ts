import { createApp } from './app'
import type { Env } from './types/env'

/**
 * Admin パネル エントリーポイント
 */
const app = createApp()

export default {
  fetch: app.fetch,
  scheduled: async (event: ScheduledEvent, _env: Env, _ctx: ExecutionContext) => {
    // 定期実行処理があれば実装
    console.log('Scheduled event triggered:', event.cron)
  },
}