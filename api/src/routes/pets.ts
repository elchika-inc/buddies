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

// 画像フラグ更新（内部API用）
pets.put(
  '/update-image-flags',
  withEnv(async (c) => {
    const petController = new PetController(c.env.DB)
    return petController.updateImageFlags(c)
  })
)

// 複数のIDでペット取得（内部API用）
pets.get(
  '/by-ids',
  withEnv(async (c) => {
    const petController = new PetController(c.env.DB)
    return petController.getPetsByIds(c)
  })
)

export default pets
