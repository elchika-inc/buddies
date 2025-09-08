import { Hono } from 'hono'
import { withEnv } from '../middleware/envMiddleware'
import { PetController } from '../controllers'
import type { Env } from '../types'

const pets = new Hono<{ Bindings: Env }>()

// ペット一覧取得（タイプ指定なし）
pets.get(
  '/',
  withEnv(async (c) => {
    const petController = new PetController(c.env.DB)
    return petController.getPets(c)
  })
)

// ペット一覧取得（タイプ指定あり）
pets.get(
  '/:type',
  withEnv(async (c) => {
    const petController = new PetController(c.env.DB)
    return petController.getPets(c)
  })
)

// ランダムペット取得
pets.get(
  '/:type/random',
  withEnv(async (c) => {
    const petController = new PetController(c.env.DB)
    return petController.getRandomPets(c)
  })
)

// 特定ペット取得
pets.get(
  '/:type/:id',
  withEnv(async (c) => {
    const petController = new PetController(c.env.DB)
    return petController.getPetById(c)
  })
)

export default pets
