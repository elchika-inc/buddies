/**
 * Cloudflare Workers でSPAを配信するためのワーカースクリプト
 * 静的ファイルを配信し、SPAのルーティングをサポート
 */

import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'

export interface Env {
  __STATIC_CONTENT: KVNamespace
  __STATIC_CONTENT_MANIFEST: string
  ENVIRONMENT: string
  DB: D1Database
}

// キャッシュ設定
const CACHE_CONTROL = {
  browserTTL: 60 * 60 * 24 * 30, // 30 days
  edgeTTL: 60 * 60 * 24 * 30,    // 30 days
  bypassCache: false
}

// セキュリティヘッダー
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.pawmatch.workers.dev",
    "frame-ancestors 'none'"
  ].join('; ')
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    
    // APIルートの処理
    if (url.pathname.startsWith('/api/')) {
      return handleAPIRequest(request, env)
    }
    
    try {
      // アセットの取得を試行
      const page = await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
          mapRequestToAsset: handleSPARouting,
          cacheControl: CACHE_CONTROL,
        }
      )

      // セキュリティヘッダーを追加
      const response = new Response(page.body, {
        status: page.status,
        statusText: page.statusText,
        headers: {
          ...Object.fromEntries(page.headers),
          ...SECURITY_HEADERS,
        },
      })

      // キャッシュ設定
      if (url.pathname.startsWith('/assets/')) {
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      } else if (url.pathname === '/sw.js') {
        response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
      }

      return response

    } catch (e) {
      // 404 エラーの場合、SPAのためindex.htmlを返す
      if (e instanceof Error && e.message.includes('NoSuchKey')) {
        return getSPAResponse(request, env, ctx)
      }
      
      // その他のエラー
      return new Response('Internal Server Error', { 
        status: 500,
        headers: SECURITY_HEADERS
      })
    }
  },
}

/**
 * SPAルーティング処理
 * 全てのルートをindex.htmlにマップ
 */
function handleSPARouting(request: Request): Request {
  const url = new URL(request.url)
  
  // 静的アセット（拡張子がある）はそのまま
  if (url.pathname.includes('.')) {
    return request
  }
  
  // API ルート（/apiで始まる）はそのまま - ここはAPIルーティングで処理されるのでスキップ
  if (url.pathname.startsWith('/api/')) {
    return request
  }
  
  // その他は全てindex.htmlにマップ（SPA対応）
  return mapRequestToAsset(new Request(`${url.origin}/index.html`, request))
}

/**
 * APIリクエストを処理
 */
async function handleAPIRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // CORSプリフライトリクエストに応答
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // ユーザーセッションの取得/作成
    if (url.pathname === '/api/session' && request.method === 'POST') {
      return await createUserSession(env, corsHeaders)
    }

    // 動物一覧の取得
    if (url.pathname === '/api/animals' && request.method === 'GET') {
      const species = url.searchParams.get('species') // 'dog' or 'cat'
      return await getAnimals(env, species, corsHeaders)
    }

    // スワイプアクションの記録
    if (url.pathname === '/api/swipe' && request.method === 'POST') {
      return await recordSwipeAction(request, env, corsHeaders)
    }

    // ユーザーのスワイプ履歴の取得
    if (url.pathname.startsWith('/api/user/') && url.pathname.endsWith('/swipes') && request.method === 'GET') {
      const userId = url.pathname.split('/')[3]
      return await getUserSwipes(userId, env, corsHeaders)
    }

    return new Response('Not Found', {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('API Error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

/**
 * ユーザーセッションを作成
 */
async function createUserSession(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const userId = crypto.randomUUID()
  const sessionId = crypto.randomUUID()

  const stmt = env.DB.prepare(`
    INSERT INTO users (id, session_id, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
  `)
  
  await stmt.bind(userId, sessionId).run()

  return new Response(JSON.stringify({ userId, sessionId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

/**
 * 動物データを取得
 */
async function getAnimals(env: Env, species: string | null, corsHeaders: Record<string, string>): Promise<Response> {
  let query = `
    SELECT 
      a.*,
      CASE 
        WHEN a.species = 'dog' THEN json_object(
          'exerciseLevel', d.exercise_level,
          'trainingLevel', d.training_level,
          'walkFrequency', d.walk_frequency,
          'needsYard', d.needs_yard,
          'apartmentFriendly', d.apartment_friendly
        )
        WHEN a.species = 'cat' THEN json_object(
          'coatLength', c.coat_length,
          'indoorOutdoor', c.indoor_outdoor,
          'socialLevel', c.social_level,
          'multiCatCompatible', c.multi_cat_compatible,
          'vocalization', c.vocalization,
          'activityTime', c.activity_time
        )
      END as species_details
    FROM animals a
    LEFT JOIN dog_details d ON a.id = d.animal_id
    LEFT JOIN cat_details c ON a.id = c.animal_id
  `

  if (species) {
    query += ` WHERE a.species = ?`
  }

  query += ` ORDER BY a.created_at ASC`

  const stmt = species ? 
    env.DB.prepare(query).bind(species) : 
    env.DB.prepare(query)

  const { results } = await stmt.all()

  // JSONフィールドをパース
  const animals = results.map((animal: any) => ({
    ...animal,
    personality: JSON.parse(animal.personality),
    care_requirements: JSON.parse(animal.care_requirements),
    species_details: JSON.parse(animal.species_details),
    // boolean値の変換
    is_neutered: Boolean(animal.is_neutered),
    is_vaccinated: Boolean(animal.is_vaccinated),
    good_with_kids: Boolean(animal.good_with_kids),
    good_with_other_animals: Boolean(animal.good_with_other_animals),
  }))

  return new Response(JSON.stringify(animals), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

/**
 * スワイプアクションを記録
 */
async function recordSwipeAction(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const { userId, animalId, action } = await request.json()

  if (!userId || !animalId || !action) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (!['like', 'pass', 'superlike'].includes(action)) {
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const swipeId = crypto.randomUUID()

  const stmt = env.DB.prepare(`
    INSERT OR REPLACE INTO swipe_actions (id, user_id, animal_id, action, timestamp)
    VALUES (?, ?, ?, ?, datetime('now'))
  `)

  try {
    await stmt.bind(swipeId, userId, animalId, action).run()
    
    return new Response(JSON.stringify({ 
      success: true, 
      swipeId,
      message: 'Swipe action recorded' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Database error:', error)
    return new Response(JSON.stringify({ error: 'Failed to record swipe action' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

/**
 * ユーザーのスワイプ履歴を取得
 */
async function getUserSwipes(userId: string, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const stmt = env.DB.prepare(`
    SELECT s.*, a.name, a.species, a.image_url, a.breed
    FROM swipe_actions s
    JOIN animals a ON s.animal_id = a.id
    WHERE s.user_id = ?
    ORDER BY s.timestamp DESC
  `)

  const { results } = await stmt.bind(userId).all()

  const swipesByAction = {
    like: [],
    pass: [],
    superlike: []
  }

  results.forEach((swipe: any) => {
    const actionList = swipesByAction[swipe.action as keyof typeof swipesByAction]
    if (actionList) {
      actionList.push(swipe)
    }
  })

  return new Response(JSON.stringify(swipesByAction), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

/**
 * SPAのindex.htmlレスポンスを取得
 */
async function getSPAResponse(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const indexRequest = new Request(`${new URL(request.url).origin}/index.html`, request)
    
    const page = await getAssetFromKV(
      {
        request: indexRequest,
        waitUntil: ctx.waitUntil.bind(ctx),
      },
      {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
        cacheControl: {
          ...CACHE_CONTROL,
          bypassCache: true // SPAページはキャッシュしない
        },
      }
    )

    return new Response(page.body, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'text/html',
        ...SECURITY_HEADERS,
        'Cache-Control': 'public, max-age=300', // 5分キャッシュ
      },
    })
    
  } catch (e) {
    return new Response('Not Found', { 
      status: 404,
      headers: SECURITY_HEADERS
    })
  }
}