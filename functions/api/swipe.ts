/**
 * Cloudflare Pages Functions: スワイプAPI
 * URL: /api/swipe
 */

interface Env {
  DB: D1Database;
}

interface SwipeRequest {
  animalId: string;
  action: 'like' | 'pass' | 'superlike';
  sessionId?: string;
  userId?: string;
  swipeDurationMs?: number;
  viewDurationMs?: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  console.log('🔄 [Pages-Function] スワイプAPI開始 - POST /api/swipe');

  // CORS設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    const data: SwipeRequest = await request.json();
    const { animalId, action, sessionId, userId, swipeDurationMs, viewDurationMs } = data;

    console.log('📥 [Pages-Function] リクエストデータ受信:', {
      animalId,
      action,
      sessionId: sessionId ? sessionId.substring(0, 20) + '...' : undefined,
      userId,
      swipeDurationMs,
      viewDurationMs,
      timestamp: new Date().toISOString()
    });

    // バリデーション
    if (!animalId || !action) {
      console.error('❌ [Pages-Function] バリデーションエラー: 必須パラメータ不足');
      return new Response(JSON.stringify({
        success: false,
        error: 'animalId と action は必須です'
      }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    if (!['like', 'pass', 'superlike'].includes(action)) {
      console.error('❌ [Pages-Function] バリデーションエラー: 無効なaction:', action);
      return new Response(JSON.stringify({
        success: false,
        error: 'action は like, pass, superlike のいずれかである必要があります'
      }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // D1データベース処理
    console.log('🔄 [Pages-Function] D1データベース処理開始');
    
    // ユーザーの取得または作成
    let finalUserId = userId;
    if (!finalUserId && sessionId) {
      console.log('🔄 [Pages-Function] ユーザー取得/作成開始');
      
      // 既存ユーザー検索
      const existingUser = await env.DB.prepare(`
        SELECT id FROM users WHERE session_id = ?
      `).bind(sessionId).first<{ id: string }>();

      if (existingUser) {
        finalUserId = existingUser.id;
        console.log('✅ [Pages-Function] 既存ユーザー発見:', finalUserId);
      } else {
        // 新規ユーザー作成
        finalUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await env.DB.prepare(`
          INSERT INTO users (id, session_id, created_at, last_active_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
        `).bind(finalUserId, sessionId).run();
        
        console.log('✅ [Pages-Function] 新規ユーザー作成:', finalUserId);
      }
    }

    // スワイプ記録
    const swipeId = `swipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🔄 [Pages-Function] スワイプ記録開始');
    const swipeResult = await env.DB.prepare(`
      INSERT INTO swipe_history (
        id, user_id, session_id, animal_id, action, 
        swipe_duration_ms, view_duration_ms, device_info, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      swipeId,
      finalUserId || null,
      sessionId || null,
      animalId,
      action,
      swipeDurationMs || null,
      viewDurationMs || null,
      request.headers.get('User-Agent') || null
    ).run();

    console.log('✅ [Pages-Function] スワイプ記録完了:', {
      swipeId,
      success: swipeResult.success,
      changes: swipeResult.meta.changes
    });

    // 動物のlike_countを更新
    if (action === 'like' || action === 'superlike') {
      console.log('🔄 [Pages-Function] like_count更新開始');
      await env.DB.prepare(`
        UPDATE animals 
        SET like_count = like_count + 1, updated_at = datetime('now')
        WHERE id = ?
      `).bind(animalId).run();
      console.log('✅ [Pages-Function] like_count更新完了');
    }

    // マッチング作成
    if ((action === 'like' || action === 'superlike') && finalUserId) {
      console.log('🔄 [Pages-Function] マッチング作成開始');
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await env.DB.prepare(`
        INSERT OR IGNORE INTO matches (id, user_id, animal_id, matched_at, status)
        VALUES (?, ?, ?, datetime('now'), 'active')
      `).bind(matchId, finalUserId, animalId).run();
      
      console.log('✅ [Pages-Function] マッチング作成完了:', matchId);
    }

    const response = {
      success: true,
      swipeId,
      message: 'スワイプが記録されました（Pages Functions）'
    };
    
    console.log('📤 [Pages-Function] 成功レスポンス送信:', response);
    return new Response(JSON.stringify(response), { headers: corsHeaders });

  } catch (error) {
    console.error('❌ [Pages-Function] スワイプ記録エラー:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'スワイプ記録に失敗しました'
    };
    
    console.log('📤 [Pages-Function] エラーレスポンス送信:', errorResponse);
    return new Response(JSON.stringify(errorResponse), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
};

// OPTIONSメソッド（CORS プリフライト）
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};