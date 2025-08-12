/**
 * スワイプアクションを記録するためのAPI関数
 */

import { normalizeApiError } from '../utils/errorHandler'
import { logger } from '../utils/logger'

export interface SwipeRecord {
  animalId: string
  action: 'like' | 'pass' | 'superlike'
  sessionId: string
}

export interface SwipeHistoryRecord extends SwipeRecord {
  timestamp: number
  id: string
}

export interface SwipeResult {
  success: boolean
  message?: string
  error?: string
  swipeId?: string
}

/**
 * セッションIDを取得または生成
 */
export function getSessionId(): string {
  let sessionId = localStorage.getItem('pawmatch_session_id')
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('pawmatch_session_id', sessionId)
  }
  
  return sessionId
}

/**
 * スワイプアクションを記録
 */
export async function recordSwipe(swipeData: SwipeRecord): Promise<SwipeResult> {
  try {
    logger.debug('スワイプ記録開始', swipeData)
    
    // 開発中はローカルストレージに保存
    const swipeHistory = JSON.parse(localStorage.getItem('pawmatch_swipe_history') || '[]')
    const swipeRecord = {
      ...swipeData,
      timestamp: Date.now(),
      id: `swipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    swipeHistory.push(swipeRecord)
    localStorage.setItem('pawmatch_swipe_history', JSON.stringify(swipeHistory))
    
    logger.debug('ローカルストレージに保存完了', { swipeId: swipeRecord.id })
    
    return {
      success: true,
      message: 'スワイプが記録されました',
      swipeId: swipeRecord.id
    }
  } catch (error) {
    const errorMessage = normalizeApiError(error, 'スワイプの記録に失敗しました')
    logger.error('スワイプ記録エラー', { error: errorMessage })
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * スワイプ履歴を取得
 */
export function getSwipeHistory(): SwipeHistoryRecord[] {
  try {
    return JSON.parse(localStorage.getItem('pawmatch_swipe_history') || '[]')
  } catch {
    return []
  }
}

/**
 * スワイプ履歴をクリア
 */
export function clearSwipeHistory(): void {
  localStorage.removeItem('pawmatch_swipe_history')
  localStorage.removeItem('pawmatch_session_id')
}