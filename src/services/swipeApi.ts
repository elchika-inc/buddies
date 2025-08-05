/**
 * スワイプAPI関連の型定義とサービス関数
 */

export interface SwipeRequest {
  animalId: string;
  action: 'like' | 'pass' | 'superlike';
  sessionId?: string;
  userId?: string;
  swipeDurationMs?: number;
  viewDurationMs?: number;
}

export interface SwipeResponse {
  success: boolean;
  swipeId?: string;
  message?: string;
  error?: string;
}

export interface SwipeHistoryItem {
  id: string;
  animal_id: string;
  action: string;
  timestamp: string;
  animal_name?: string;
  species?: string;
  swipe_duration_ms?: number;
  view_duration_ms?: number;
}

export interface SwipeStats {
  totalSwipes: number;
  likes: number;
  passes: number;
  superLikes: number;
  matches: number;
}

export interface Match {
  id: string;
  animal_id: string;
  matched_at: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  gender: string;
  imageUrl?: string;
}

/**
 * セッションIDを取得または生成
 */
export function getSessionId(): string {
  const storageKey = 'pawmatch_session_id';
  let sessionId = localStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}

/**
 * スワイプアクションを記録（Pages Functions）
 */
export async function recordSwipe(data: SwipeRequest): Promise<SwipeResponse> {
  const sessionId = data.sessionId || getSessionId();
  const requestData = { ...data, sessionId };
  
  console.log('🔄 [SwipeAPI-Pages] スワイプ記録開始:', {
    animalId: data.animalId,
    action: data.action,
    sessionId: sessionId.substring(0, 20) + '...',
    timestamp: new Date().toISOString()
  });

  try {
    const response = await fetch('/api/swipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'サーバーエラー' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ [SwipeAPI-Pages] スワイプ記録成功:', {
      swipeId: result.swipeId,
      action: data.action,
      animalId: data.animalId
    });
    
    return result;
  } catch (error) {
    console.error('❌ [SwipeAPI-Pages] スワイプ記録エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'スワイプ記録に失敗しました',
    };
  }
}

/**
 * スワイプ履歴を取得（Pages Functions）
 */
export async function getSwipeHistory(
  userId?: string,
  sessionId?: string,
  limit: number = 50
): Promise<{ success: boolean; history?: SwipeHistoryItem[]; error?: string }> {
  try {
    console.log('🔄 [SwipeAPI-Pages] スワイプ履歴取得開始');
    
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (sessionId) params.append('sessionId', sessionId);
    params.append('limit', limit.toString());
    
    const response = await fetch(`/api/swipe/history?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'サーバーエラー' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ [SwipeAPI-Pages] スワイプ履歴取得成功:', result.history?.length || 0);
    
    return result;
  } catch (error) {
    console.error('❌ [SwipeAPI-Pages] スワイプ履歴取得エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'スワイプ履歴取得に失敗しました',
    };
  }
}

/**
 * スワイプ統計を取得（Pages Functions）
 */
export async function getSwipeStats(
  userId?: string,
  sessionId?: string
): Promise<{ success: boolean; stats?: SwipeStats; error?: string }> {
  try {
    console.log('🔄 [SwipeAPI-Pages] スワイプ統計取得開始');
    
    const currentSessionId = sessionId || getSessionId();
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (currentSessionId) params.append('sessionId', currentSessionId);
    
    const response = await fetch(`/api/swipe/stats?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'サーバーエラー' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ [SwipeAPI-Pages] スワイプ統計取得成功:', result.stats);
    
    return result;
  } catch (error) {
    console.error('❌ [SwipeAPI-Pages] スワイプ統計取得エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'スワイプ統計取得に失敗しました',
    };
  }
}

/**
 * マッチング一覧を取得
 */
export async function getMatches(
  userId: string
): Promise<{ success: boolean; matches?: Match[]; error?: string }> {
  try {
    const params = new URLSearchParams();
    params.append('userId', userId);

    const response = await fetch(`/api/matches?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('マッチング取得エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'マッチング取得に失敗しました',
    };
  }
}