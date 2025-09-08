/**
 * サービス層の共通型定義
 */

/**
 * データ準備状態
 */
export interface DataReadiness {
  isReady: boolean
  totalPets: number
  totalDogs: number
  totalCats: number
  petsWithJpeg: number
  imageCoverage: number
  lastSyncAt: string | null
  message: string
}

/**
 * ペット統計情報
 */
export interface PetStatistics {
  totalPets: number
  totalDogs: number
  totalCats: number
  petsWithJpeg: number
  petsWithWebp: number
  dogsWithJpeg: number
  dogsWithWebp: number
  catsWithJpeg: number
  catsWithWebp: number
}

/**
 * 同期ジョブステータス
 */
export interface SyncJobStatus {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  startedAt: string
  completedAt?: string
  error?: string
}
