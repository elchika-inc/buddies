// Re-export from shared types
export * from '../../../shared/types/result'
import { Result } from '../../../shared/types/result'

// 後方互換性のためのエイリアス
export const Ok = Result.ok
export const Err = Result.err
export const isOk = Result.isSuccess
export const isErr = Result.isFailure
