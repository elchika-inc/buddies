import type { Context } from 'hono'
import type { Env } from '../types'
import { PetController } from '../controllers'
import { ImageController } from '../controllers/ImageController'

/**
 * コントローラーのインスタンスを生成するファクトリー
 * 環境変数の注入を一元管理
 */
export class ControllerFactory {
  /**
   * PetControllerのインスタンスを生成
   */
  static createPetController(c: Context<{ Bindings: Env }>): PetController {
    return new PetController(c.env.DB, c.env)
  }

  /**
   * ImageControllerのインスタンスを生成
   */
  static createImageController(c: Context<{ Bindings: Env }>): ImageController {
    return new ImageController(c.env.IMAGES_BUCKET, c.env.DB, c.env)
  }
}

/**
 * withControllerヘルパー
 * コントローラーのインスタンス生成と環境変数注入を簡潔に行う
 */
export function withPetController<T>(
  handler: (controller: PetController, c: Context<{ Bindings: Env }>) => Promise<T>
) {
  return async (c: Context<{ Bindings: Env }>) => {
    const controller = ControllerFactory.createPetController(c)
    return handler(controller, c)
  }
}

export function withImageController<T>(
  handler: (controller: ImageController, c: Context<{ Bindings: Env }>) => Promise<T>
) {
  return async (c: Context<{ Bindings: Env }>) => {
    const controller = ControllerFactory.createImageController(c)
    return handler(controller, c)
  }
}
