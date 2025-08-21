/**
 * Cloudflare Worker: GitHub Actions Screenshot Coordinator
 * 
 * このWorkerは定期的にPet-Homeからペット情報を取得し、
 * GitHub Actionsをトリガーしてスクリーンショットを取得します。
 */

export default {
  /**
   * 画像が不足しているペットを取得
   */
  async getPetsWithMissingImages(env, limit = 50) {
    try {
      const result = await env.DB.prepare(`
        SELECT id, type, name, source_url, screenshot_requested_at
        FROM pets 
        WHERE has_jpeg = FALSE OR has_jpeg IS NULL
        ORDER BY created_at DESC 
        LIMIT ?
      `).bind(limit).all();
      
      // Pet-Home形式に変換
      return (result.results || []).map(pet => ({
        id: pet.id,
        petId: pet.id.replace('pethome_', ''),
        type: pet.type,
        name: pet.name,
        sourceUrl: pet.source_url || `https://www.pet-home.jp/${pet.type}s/pn${pet.id.replace('pethome_', '')}/`
      }));
    } catch (error) {
      console.error('Failed to get pets with missing images:', error);
      return [];
    }
  },

  /**
   * 不足画像数を取得
   */
  async getMissingImageCount(env) {
    try {
      const result = await env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM pets 
        WHERE has_jpeg = FALSE OR has_jpeg IS NULL
      `).first();
      
      return result?.count || 0;
    } catch (error) {
      console.error('Failed to get missing image count:', error);
      return 0;
    }
  },
  /**
   * Cron trigger - 定期実行
   * Cron設定例: "0 */6 * * *" (6時間ごと)
   */
  async scheduled(event, env, ctx) {
    console.log('🚀 Starting scheduled pet screenshot job');
    
    try {
      // データベースから画像が不足しているペットを取得
      const missingImagePets = await this.getPetsWithMissingImages(env, 60);
      
      if (missingImagePets.length === 0) {
        console.log('✅ All pets have images, no screenshots needed');
        return;
      }
      
      console.log(`📊 Found ${missingImagePets.length} pets missing images`);
      
      // バッチに分割（10件ずつ）
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < missingImagePets.length; i += batchSize) {
        batches.push(missingImagePets.slice(i, i + batchSize));
      }
      
      console.log(`📦 Created ${batches.length} batches`);
      
      // 各バッチをGitHub Actionsで処理
      const results = [];
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchId = `missing-images-${new Date().toISOString().split('T')[0]}-${i + 1}`;
        
        console.log(`🎬 Triggering GitHub Actions for batch ${i + 1}/${batches.length}`);
        
        const result = await triggerGitHubActions(env, {
          pets_batch: JSON.stringify(batch),
          batch_id: batchId
        });
        
        results.push({
          batchId,
          petCount: batch.length,
          triggered: result.success,
          error: result.error
        });
        
        // バッチ間で30秒待機（レート制限対策）
        if (i < batches.length - 1) {
          await new Promise(r => setTimeout(r, 30000));
        }
      }
      
      // 結果をD1データベースに記録
      await recordJobResults(env, results);
      
      console.log('✅ Screenshot job completed');
      
    } catch (error) {
      console.error('❌ Job failed:', error);
      throw error;
    }
  },
  
  /**
   * HTTP trigger - 手動実行用
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 認証チェック
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${env.API_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // パスに応じて処理
    switch (url.pathname) {
      case '/trigger':
        // 手動でスクリーンショットジョブをトリガー
        ctx.waitUntil(this.scheduled(null, env, ctx));
        return new Response('Screenshot job triggered', { status: 200 });
        
      case '/status':
        // 最新のジョブステータスと不足画像統計を取得
        const [jobStatus, missingCount] = await Promise.all([
          getJobStatus(env),
          this.getMissingImageCount(env)
        ]);
        
        return new Response(JSON.stringify({
          ...jobStatus,
          missingImages: missingCount
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      default:
        return new Response('Not found', { status: 404 });
    }
  }
};

/**
 * Pet-Homeからペットリストを取得
 */
async function fetchPetList(petType, limit, env) {
  const baseUrl = `https://www.pet-home.jp/${petType === 'dog' ? 'dogs' : 'cats'}/`;
  const pets = [];
  let page = 1;
  
  while (pets.length < limit) {
    try {
      const url = `${baseUrl}?page=${page}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Failed to fetch ${petType} page ${page}: ${response.status}`);
        break;
      }
      
      const html = await response.text();
      
      // ペットIDを抽出
      const idMatches = html.matchAll(/href="\/(?:dogs|cats)\/[^\/]+\/pn(\d+)\//g);
      const pageIds = [];
      for (const match of idMatches) {
        const id = match[1];
        if (!pageIds.includes(id)) {
          pageIds.push(id);
        }
      }
      
      if (pageIds.length === 0) break;
      
      // 基本情報を取得
      for (const id of pageIds) {
        if (pets.length >= limit) break;
        
        const nameMatch = html.match(new RegExp(`href="/(?:dogs|cats)/[^/]+/pn${id}/"[^>]*>([^<]+)</a>`));
        const pet = {
          id: `pethome_${id}`,
          petId: id,
          type: petType,
          name: nameMatch ? nameMatch[1].trim() : `${petType === 'dog' ? '犬' : '猫'}ID:${id}`,
          sourceUrl: `https://www.pet-home.jp/${petType === 'dog' ? 'dogs' : 'cats'}/pn${id}/`
        };
        
        pets.push(pet);
      }
      
      page++;
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (error) {
      console.error(`Error fetching ${petType} page ${page}:`, error);
      break;
    }
  }
  
  return pets.slice(0, limit);
}

/**
 * GitHub Actionsをトリガー
 */
async function triggerGitHubActions(env, inputs) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/pet-screenshot.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'PawMatch-Worker'
        },
        body: JSON.stringify({
          ref: env.GITHUB_BRANCH || 'main',
          inputs
        })
      }
    );
    
    if (response.status === 204) {
      return { success: true };
    }
    
    const errorText = await response.text();
    console.error(`GitHub API error: ${response.status} - ${errorText}`);
    
    return {
      success: false,
      error: `HTTP ${response.status}: ${errorText}`
    };
    
  } catch (error) {
    console.error('Failed to trigger GitHub Actions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ジョブ結果をD1データベースに記録
 */
async function recordJobResults(env, results) {
  if (!env.DB) {
    console.log('No database configured, skipping result recording');
    return;
  }
  
  try {
    const timestamp = new Date().toISOString();
    const successCount = results.filter(r => r.triggered).length;
    const failureCount = results.filter(r => !r.triggered).length;
    
    await env.DB.prepare(`
      INSERT INTO screenshot_jobs (
        timestamp,
        total_batches,
        successful_batches,
        failed_batches,
        details
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      timestamp,
      results.length,
      successCount,
      failureCount,
      JSON.stringify(results)
    ).run();
    
    console.log(`📝 Recorded job results: ${successCount}/${results.length} batches successful`);
    
  } catch (error) {
    console.error('Failed to record job results:', error);
  }
}

/**
 * 最新のジョブステータスを取得
 */
async function getJobStatus(env) {
  if (!env.DB) {
    return { error: 'No database configured' };
  }
  
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM screenshot_jobs
      ORDER BY timestamp DESC
      LIMIT 1
    `).first();
    
    return result || { message: 'No jobs found' };
    
  } catch (error) {
    return { error: error.message };
  }
}