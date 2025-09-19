import { Hono } from 'hono'
import { withEnv } from '../middleware/EnvMiddleware'
import { withPetController } from '../factories/ControllerFactory'
import type { Env } from '../types'

const pets = new Hono<{ Bindings: Env }>()

// タイプ別ペット一覧取得
pets.get(
  '/type/:type',
  withEnv(withPetController(async (controller, c) => controller.getPetsByType(c)))
)

// IDで特定ペット取得
pets.get(
  '/type/:type/id/:id',
  withEnv(withPetController(async (controller, c) => controller.getPetById(c)))
)

// 画像フラグ更新（内部API用）
pets.put(
  '/update-image-flags',
  withEnv(withPetController(async (controller, c) => controller.updateImageFlags(c)))
)

// 複数のIDでペット取得（内部API用）
pets.get('/by-ids', withEnv(withPetController(async (controller, c) => controller.getPetsByIds(c))))

export default pets
