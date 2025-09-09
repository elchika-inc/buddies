import { Hono } from 'hono'
import { withEnv } from '../middleware/envMiddleware'
import { PetController } from '../controllers'
import type { Env } from '../types'

const pets = new Hono<{ Bindings: Env }>()

// 全ペット一覧取得（タイプ指定なし）
pets.get(
  '/all',
  withEnv(async (c) => {
    const petController = new PetController(c.env.DB)
    return petController.getAllPets(c)
  })
)

// タイプ別ペット一覧取得
pets.get(
  '/type/:type',
  withEnv(async (c) => {
    const petController = new PetController(c.env.DB)
    return petController.getPetsByType(c)
  })
)

// ランダムペット取得
pets.get(
  '/type/:type/random',
  withEnv(async (c) => {
    const petController = new PetController(c.env.DB)
    return petController.getRandomPets(c)
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
