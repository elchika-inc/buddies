/**
 * Cloudflare Pages Functions: スワイプ履歴API
 * URL: /api/swipe/history
 */

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  console.log('🔄 [Pages-Function] スワイプ履歴API開始 - GET /api/swipe/history');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const sessionId = url.searchParams.get('sessionId');
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');

    if (!userId && !sessionId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'userId または sessionId が必要です'
      }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const limit = limitParam ? parseInt(limitParam) : 50;
    const offset = offsetParam ? parseInt(offsetParam) : 0;

    console.log('🔄 [Pages-Function] 履歴取得開始:', {
      userId,
      sessionId: sessionId ? sessionId.substring(0, 20) + '...' : undefined,
      limit,
      offset
    });

    const whereClause = userId ? 'user_id = ?' : 'session_id = ?';
    const bindValue = userId || sessionId;

    // スワイプ履歴を取得
    const historyResult = await env.DB.prepare(`
      SELECT 
        sh.id,
        sh.animal_id,
        sh.action,
        sh.timestamp,
        sh.swipe_duration_ms,
        sh.view_duration_ms,
        a.name as animal_name,
        a.type as animal_type,
        a.breed,
        a.age,
        a.gender,
        a.image_url
      FROM swipe_history sh
      LEFT JOIN animals a ON sh.animal_id = a.id
      WHERE ${whereClause}
      ORDER BY sh.timestamp DESC
      LIMIT ? OFFSET ?
    `).bind(bindValue, limit, offset).all();

    // 総件数を取得
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM swipe_history
      WHERE ${whereClause}
    `).bind(bindValue).first<{ total: number }>();

    const response = {
      success: true,
      history: historyResult.results || [],
      pagination: {
        total: countResult?.total || 0,
        limit,
        offset,
        hasMore: (countResult?.total || 0) > offset + limit
      }
    };

    console.log('✅ [Pages-Function] 履歴取得完了:', {
      count: historyResult.results?.length || 0,
      total: countResult?.total || 0
    });

    return new Response(JSON.stringify(response), { headers: corsHeaders });

  } catch (error) {
    console.error('❌ [Pages-Function] 履歴取得エラー:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '履歴取得に失敗しました'
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};