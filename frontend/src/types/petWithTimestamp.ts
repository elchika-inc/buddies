/**
 * タイムスタンプ付きペットデータの型定義
 */

export interface PetWithTimestamp {
  createdAt?: string | number | Date
}

/**
 * ペットデータからタイムスタンプを安全に抽出
 */
export function extractTimestamp(pet: PetWithTimestamp): number {
  // createdAtを取得
  const timestamp = pet.createdAt

  if (timestamp instanceof Date) {
    return timestamp.getTime()
  }

  if (typeof timestamp === 'number') {
    return timestamp
  }

  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp).getTime()
    return isNaN(parsed) ? 0 : parsed
  }

  return 0 // デフォルト値
}

/**
 * ペットデータを日付でソート（新しい順）
 */
export function sortPetsByDate<T extends PetWithTimestamp>(pets: T[]): T[] {
  return [...pets].sort((a, b) => {
    const aTimestamp = extractTimestamp(a)
    const bTimestamp = extractTimestamp(b)
    return bTimestamp - aTimestamp // 降順（新しい順）
  })
}
