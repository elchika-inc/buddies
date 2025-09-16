import type { Context } from 'hono'
import type { Env } from '../../types'

export class CrawlerController {
  constructor(private env: Env) {}

  async triggerCrawl(c: Context) {
    try {
      const { type = 'dog', limit = 5 } = await c.req.json().catch(() => ({}))

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
          crawlerResponse.status
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
          statusResponse.status
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
