import { Hono } from 'hono'
import { withEnv } from '../middleware/EnvMiddleware'
import { HealthController } from '../controllers'
import type { Env } from '../types'

const health = new Hono<{ Bindings: Env }>()

health.get(
  '/',
  withEnv(async (c) => {
    const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET)
    return healthController.getHealthStatus(c)
  })
)

health.get(
  '/ready',
  withEnv(async (c) => {
    const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET)
    return healthController.getReadinessStatus(c)
  })
)

export default health
