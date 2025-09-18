import { Hono } from 'hono'
import { withEnv } from '../middleware/EnvMiddleware'
import { HealthController } from '../controllers'
import type { Env } from '../types'

const stats = new Hono<{ Bindings: Env }>()

stats.get(
  '/',
  withEnv(async (c) => {
    const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET)
    return healthController.getStats(c)
  })
)

stats.get(
  '/dogs/missing-screenshots',
  withEnv(async (c) => {
    const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET)
    return healthController.getDogsWithoutScreenshots(c)
  })
)

stats.get(
  '/cats/missing-screenshots',
  withEnv(async (c) => {
    const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET)
    return healthController.getCatsWithoutScreenshots(c)
  })
)

stats.get(
  '/dogs/missing-conversions',
  withEnv(async (c) => {
    const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET)
    return healthController.getDogsWithoutConversions(c)
  })
)

stats.get(
  '/cats/missing-conversions',
  withEnv(async (c) => {
    const healthController = new HealthController(c.env.DB, c.env.IMAGES_BUCKET)
    return healthController.getCatsWithoutConversions(c)
  })
)

export default stats
