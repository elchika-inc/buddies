/**
 * Cloudflare Workers エントリーポイント
 * D1データベースを使用したPawMatchバックエンド
 */

import { createCrawlerService } from './services/crawlerService';
import { configureDataStorage } from './graphql/resolvers';

export interface Env {
  DB: unknown; // D1Database型は@cloudflare/workers-typesから取得
  ENVIRONMENT?: string;
}

export default {
  async fetch(request: Request, env: Env, _ctx: unknown): Promise<Response> {
    // CORS設定
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // プリフライトリクエストの処理
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // D1データベースの設定
      if (env.DB) {
        configureDataStorage(env.DB);
      }

      const url = new URL(request.url);
      const path = url.pathname;

      // API ルーティング
      if (path.startsWith('/api/')) {
        return await handleApiRequest(request, env, path);
      }

      // GraphQL エンドポイント
      if (path === '/graphql') {
        return await handleGraphQLRequest(request, env);
      }

      // クローラー管理エンドポイント
      if (path.startsWith('/crawler/')) {
        return await handleCrawlerRequest(request, env, path);
      }

      // ヘルスチェック
      if (path === '/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          environment: env.ENVIRONMENT || 'production'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 404 Not Found
      return new Response('Not Found', { 
        status: 404, 
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  },

  // スケジュール実行（Cron Triggers）
  async scheduled(_controller: unknown, env: Env, _ctx: unknown): Promise<void> {
    console.log('⏰ スケジュール実行を開始します');

    try {
      // D1データベースの設定
      if (env.DB) {
        configureDataStorage(env.DB);
      }

      // クローラーサービスの作成と実行
      const crawlerService = createCrawlerService(env.DB);
      const result = await crawlerService.scheduledRun();

      console.log('✅ スケジュール実行完了:', {
        success: result.success,
        totalAnimals: result.totalAnimals,
        timestamp: result.timestamp
      });

    } catch (error) {
      console.error('❌ スケジュール実行エラー:', error);
    }
  }
};

/**
 * API リクエストの処理
 */
async function handleApiRequest(request: Request, env: Env, path: string): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // 動物データAPI
  if (path === '/api/animals') {
    // GraphQLリゾルバーを直接呼び出し（簡易実装）
    const { resolvers } = await import('./graphql/resolvers');
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    const result = await resolvers.Query.animals(null, { page, limit });
    return new Response(JSON.stringify(result), { headers: corsHeaders });
  }

  if (path === '/api/dogs') {
    const { resolvers } = await import('./graphql/resolvers');
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    const result = await resolvers.Query.dogs(null, { page, limit });
    return new Response(JSON.stringify(result), { headers: corsHeaders });
  }

  if (path === '/api/cats') {
    const { resolvers } = await import('./graphql/resolvers');
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    const result = await resolvers.Query.cats(null, { page, limit });
    return new Response(JSON.stringify(result), { headers: corsHeaders });
  }

  // スワイプ記録API
  if (path === '/api/swipe' && request.method === 'POST') {
    console.log('🔄 [Worker] スワイプAPI開始 - POST /api/swipe');
    
    try {
      const data = await request.json();
      const { animalId, action, sessionId, userId, swipeDurationMs, viewDurationMs } = data;

      console.log('📥 [Worker] リクエストデータ受信:', {
        animalId,
        action,
        sessionId: sessionId ? sessionId.substring(0, 20) + '...' : undefined,
        userId,
        swipeDurationMs,
        viewDurationMs,
        timestamp: new Date().toISOString()
      });

      if (!animalId || !action) {
        console.error('❌ [Worker] バリデーションエラー: 必須パラメータ不足');
        return new Response(JSON.stringify({
          success: false,
          error: 'animalId と action は必須です'
        }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      if (!['like', 'pass', 'superlike'].includes(action)) {
        console.error('❌ [Worker] バリデーションエラー: 無効なaction:', action);
        return new Response(JSON.stringify({
          success: false,
          error: 'action は like, pass, superlike のいずれかである必要があります'
        }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      console.log('🔄 [Worker] D1Storageの初期化');
      // D1Storageを使ってスワイプを記録
      const { D1DataStorage } = await import('./services/d1Storage');
      const storage = new D1DataStorage(env.DB as any);

      // セッションIDからユーザーを取得または作成
      let finalUserId = userId;
      if (!finalUserId && sessionId) {
        console.log('🔄 [Worker] ユーザー取得/作成開始 sessionId:', sessionId.substring(0, 20) + '...');
        const user = await storage.getOrCreateUser(sessionId);
        finalUserId = user.id;
        console.log('✅ [Worker] ユーザー取得/作成完了:', { 
          userId: finalUserId, 
          isNew: user.isNew 
        });
      }

      console.log('🔄 [Worker] スワイプ記録開始');
      const result = await storage.recordSwipe({
        userId: finalUserId,
        sessionId: sessionId,
        animalId,
        action,
        swipeDurationMs,
        viewDurationMs,
        deviceInfo: request.headers.get('User-Agent') || undefined
      });

      console.log('✅ [Worker] スワイプ記録完了:', { 
        swipeId: result.id, 
        success: result.success 
      });

      // likeまたはsuperlikeの場合はマッチングも作成
      if ((action === 'like' || action === 'superlike') && finalUserId) {
        console.log('🔄 [Worker] マッチング作成開始');
        const matchResult = await storage.createMatch(finalUserId, animalId);
        console.log('✅ [Worker] マッチング作成完了:', { 
          matchId: matchResult.id, 
          success: matchResult.success 
        });
      }

      const response = {
        success: true,
        swipeId: result.id,
        message: 'スワイプが記録されました'
      };
      
      console.log('📤 [Worker] 成功レスポンス送信:', response);
      return new Response(JSON.stringify(response), { headers: corsHeaders });

    } catch (error) {
      console.error('❌ [Worker] スワイプ記録エラー:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'スワイプ記録に失敗しました'
      };
      
      console.log('📤 [Worker] エラーレスポンス送信:', errorResponse);
      return new Response(JSON.stringify(errorResponse), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  // スワイプ履歴取得API
  if (path === '/api/swipe/history' && request.method === 'GET') {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get('userId');
      const sessionId = url.searchParams.get('sessionId');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      if (!userId && !sessionId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'userId または sessionId が必要です'
        }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      const { D1DataStorage } = await import('./services/d1Storage');
      const storage = new D1DataStorage(env.DB as any);

      const history = await storage.getUserSwipeHistory(userId || undefined, sessionId || undefined, limit);

      return new Response(JSON.stringify({
        success: true,
        history
      }), { headers: corsHeaders });

    } catch (error) {
      console.error('スワイプ履歴取得エラー:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'スワイプ履歴取得に失敗しました'
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  // スワイプ統計取得API
  if (path === '/api/swipe/stats' && request.method === 'GET') {
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

      const { D1DataStorage } = await import('./services/d1Storage');
      const storage = new D1DataStorage(env.DB as any);

      const stats = await storage.getSwipeStats(userId || undefined, sessionId || undefined);

      return new Response(JSON.stringify({
        success: true,
        stats
      }), { headers: corsHeaders });

    } catch (error) {
      console.error('スワイプ統計取得エラー:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'スワイプ統計取得に失敗しました'
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  // マッチング取得API
  if (path === '/api/matches' && request.method === 'GET') {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'userId が必要です'
        }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      const { D1DataStorage } = await import('./services/d1Storage');
      const storage = new D1DataStorage(env.DB as any);

      const matches = await storage.getUserMatches(userId);

      return new Response(JSON.stringify({
        success: true,
        matches
      }), { headers: corsHeaders });

    } catch (error) {
      console.error('マッチング取得エラー:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'マッチング取得に失敗しました'
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  return new Response('API endpoint not found', { 
    status: 404, 
    headers: corsHeaders 
  });
}

/**
 * GraphQL リクエストの処理
 */
async function handleGraphQLRequest(_request: Request, _env: Env): Promise<Response> {
  // 簡易GraphQL実装（本格的にはApollo Serverなどを使用）
  return new Response(JSON.stringify({
    message: 'GraphQL endpoint - not implemented yet'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * クローラー管理リクエストの処理
 */
async function handleCrawlerRequest(request: Request, env: Env, path: string): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const crawlerService = createCrawlerService(env.DB);

  // クローラー状態取得
  if (path === '/crawler/status' && request.method === 'GET') {
    const status = crawlerService.getStatus();
    const stats = await crawlerService.getDataStats();
    
    return new Response(JSON.stringify({
      ...status,
      ...stats
    }), { headers: corsHeaders });
  }

  // クローラー手動実行
  if (path === '/crawler/run' && request.method === 'POST') {
    try {
      const result = await crawlerService.crawlAndSave({
        dogLimit: 100,
        catLimit: 100
      });
      
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  return new Response('Crawler endpoint not found', { 
    status: 404, 
    headers: corsHeaders 
  });
}