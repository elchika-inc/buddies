import type { z } from 'zod'
import type { Pet, Dog, Cat } from './pet'
import { isPet as isPetFromPet, isDog as isDogFromPet, isCat as isCatFromPet } from './pet'

/**
 * 統一型ガード関数
 * 全ワークスペースで共通利用する型ガード
 */

/**
 * ペットデータの型ガード
 */
export function isPet(value: unknown): value is Pet {
  return isPetFromPet(value)
}

/**
 * 犬データの型ガード
 */
export function isDog(pet: Pet): pet is Dog {
  return isDogFromPet(pet)
}

/**
 * 猫データの型ガード
 */
export function isCat(pet: Pet): pet is Cat {
  return isCatFromPet(pet)
}

/**
 * ペット配列の型ガード
 */
export function isPetArray(value: unknown): value is Pet[] {
  return Array.isArray(value) && value.every(isPet)
}

/**
 * DBレコードがペットデータとして有効かチェック
 */
export function isValidPetRecord(record: unknown): record is Record<string, unknown> {
  if (!record || typeof record !== 'object') {
    return false
  }

  const obj = record as Record<string, unknown>

  // 必須フィールドの存在確認
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['type'] === 'string' &&
    typeof obj['name'] === 'string' &&
    (obj['type'] === 'dog' || obj['type'] === 'cat')
  )
}

/**
 * カウント結果の型ガード
 */
export function isCountResult(value: unknown): value is { total?: number; count?: number } {
  if (!value || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>
  return (
    (typeof obj['total'] === 'number' || obj['total'] === undefined) &&
    (typeof obj['count'] === 'number' || obj['count'] === undefined)
  )
}

/**
 * 配列内の有効な要素のみフィルタリング
 */
export function filterValidItems<T>(
  items: unknown[],
  guard: (item: unknown) => item is T
): T[] {
  return items.filter(guard)
}

/**
 * 安全な型変換（Result型を返す）
 */
export function safeParse<T>(
  value: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(value)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}