import { Hono } from 'hono'
import { withEnv } from '../middleware/EnvMiddleware'
import { PetController } from '../controllers'
import type { Env } from '../types'

const pets = new Hono<{ Bindings: Env }>()

// タイプ別ペット一覧取得
pets.get(
  '/type/:type',
  withEnv(async (c) => {
    const petController = new PetController(c.env.DB)
    return petController.getPetsByType(c)
  })
)

// IDで特定ペット取得
pets.get(
  '/type/:type/id/:id',
  withEnv(async (c) => {
    const petController = new PetController(c.env.DB)
    return petController.getPetById(c)
  })
)

export default pets
