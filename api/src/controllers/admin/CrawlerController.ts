import type { Context } from 'hono'
import type { Env } from '../../types'
import { getCrawlerConfig } from '../../config/crawler'

export class CrawlerController {
  constructor(private env: Env) {}

  async triggerCrawl(c: Context) {
    try {
      const { type = 'dog', limit = 5, source = 'pet-home' } = await c.req.json().catch(() => ({}))

      // Crawlerサービスを直接呼び出し
      if (!this.env.CRAWLER_SERVICE) {
        return c.json(
          {
            success: false,
            error: 'Crawler service binding not configured',
          },
          500
        )
      }

      // クローラー設定を取得
      const crawlerConfig = getCrawlerConfig(source as 'pet-home')

      // Service Bindingを使用してCrawlerを起動
      const crawlerResponse = await this.env.CRAWLER_SERVICE.fetch(
        new Request('https://crawler.internal/trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Request': 'true',
          },
          body: JSON.stringify({
            type,
            limit,
            source: 'api-trigger',
            config: {
              petsPerPage: crawlerConfig.petsPerPage,
              maxPages: crawlerConfig.maxPages,
              maxBatchSize: crawlerConfig.maxBatchSize,
              requestsPerSecond: crawlerConfig.requestsPerSecond,
            },
          }),
        })
      )

      if (!crawlerResponse.ok) {
        const errorText = await crawlerResponse.text()
        return c.json(
          {
            success: false,
            error: `Crawler trigger failed: ${errorText}`,
          },
          crawlerResponse.status as 400 | 401 | 403 | 404 | 500 | 502 | 503
        )
      }

      const result = await crawlerResponse.json()

      return c.json({
        success: true,
        message: `Crawler triggered for ${type} with limit ${limit}`,
        data: result,
      })
    } catch (error) {
      console.error('Error triggering crawler:', error)
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }

  async getCrawlerStatus(c: Context) {
    try {
      if (!this.env.CRAWLER_SERVICE) {
        return c.json(
          {
            success: false,
            error: 'Crawler service binding not configured',
          },
          500
        )
      }

      const statusResponse = await this.env.CRAWLER_SERVICE.fetch(
        new Request('https://crawler.internal/status', {
          method: 'GET',
          headers: {
            'X-Internal-Request': 'true',
          },
        })
      )

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text()
        return c.json(
          {
            success: false,
            error: `Failed to get crawler status: ${errorText}`,
          },
          statusResponse.status as 400 | 401 | 403 | 404 | 500 | 502 | 503
        )
      }

      const status = await statusResponse.json()

      return c.json({
        success: true,
        data: status,
      })
    } catch (error) {
      console.error('Error getting crawler status:', error)
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
