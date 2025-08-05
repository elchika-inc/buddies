/**
 * Cloudflare Pages Functions: マッチングAPI
 * URL: /api/matches
 */

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  console.log('🔄 [Pages-Function] マッチングAPI開始 - GET /api/matches');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'userId が必要です'
      }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const limit = limitParam ? parseInt(limitParam) : 20;
    const offset = offsetParam ? parseInt(offsetParam) : 0;

    console.log('🔄 [Pages-Function] マッチング取得開始:', {
      userId,
      limit,
      offset
    });

    // マッチング一覧を取得
    const matchesResult = await env.DB.prepare(`
      SELECT 
        m.id,
        m.animal_id,
        m.matched_at,
        m.status,
        a.name as animal_name,
        a.type as animal_type,
        a.breed,
        a.age,
        a.gender,
        a.image_url,
        a.description,
        a.location,
        a.shelter_name,
        a.shelter_contact
      FROM matches m
      JOIN animals a ON m.animal_id = a.id
      WHERE m.user_id = ? AND m.status = 'active'
      ORDER BY m.matched_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all();

    // 総件数を取得
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM matches
      WHERE user_id = ? AND status = 'active'
    `).bind(userId).first<{ total: number }>();

    const response = {
      success: true,
      matches: matchesResult.results || [],
      pagination: {
        total: countResult?.total || 0,
        limit,
        offset,
        hasMore: (countResult?.total || 0) > offset + limit
      }
    };

    console.log('✅ [Pages-Function] マッチング取得完了:', {
      count: matchesResult.results?.length || 0,
      total: countResult?.total || 0
    });

    return new Response(JSON.stringify(response), { headers: corsHeaders });

  } catch (error) {
    console.error('❌ [Pages-Function] マッチング取得エラー:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'マッチング取得に失敗しました'
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