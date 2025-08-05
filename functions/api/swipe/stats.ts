/**
 * Cloudflare Pages Functions: スワイプ統計API
 * URL: /api/swipe/stats
 */

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  console.log('🔄 [Pages-Function] スワイプ統計API開始 - GET /api/swipe/stats');

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

    if (!userId && !sessionId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'userId または sessionId が必要です'
      }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('🔄 [Pages-Function] 統計取得開始:', {
      userId,
      sessionId: sessionId ? sessionId.substring(0, 20) + '...' : undefined
    });

    const whereClause = userId ? 'user_id = ?' : 'session_id = ?';
    const bindValue = userId || sessionId;

    // スワイプ統計
    const swipeStats = await env.DB.prepare(`
      SELECT 
        action,
        COUNT(*) as count
      FROM swipe_history 
      WHERE ${whereClause}
      GROUP BY action
    `).bind(bindValue).all();

    const stats = {
      totalSwipes: 0,
      likes: 0,
      passes: 0,
      superLikes: 0,
      matches: 0
    };

    swipeStats.results?.forEach((row: any) => {
      stats.totalSwipes += row.count;
      if (row.action === 'like') stats.likes = row.count;
      else if (row.action === 'pass') stats.passes = row.count;
      else if (row.action === 'superlike') stats.superLikes = row.count;
    });

    // マッチング数（ユーザーIDがある場合のみ）
    if (userId) {
      const matchResult = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM matches WHERE user_id = ? AND status = 'active'
      `).bind(userId).first<{ count: number }>();
      
      stats.matches = matchResult?.count || 0;
    }

    console.log('✅ [Pages-Function] 統計取得完了:', stats);

    return new Response(JSON.stringify({
      success: true,
      stats
    }), { headers: corsHeaders });

  } catch (error) {
    console.error('❌ [Pages-Function] 統計取得エラー:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '統計取得に失敗しました'
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