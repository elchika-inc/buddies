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