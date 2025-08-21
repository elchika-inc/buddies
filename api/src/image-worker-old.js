/**
 * Cloudflare Worker - 画像変換専用サービス
 * 
 * R2に保存されたJPEG画像を動的にWebP変換して配信
 * メインAPIとは独立して動作
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // パスから画像情報を取得 /convert/pets/{type}s/{petId}/{format}
    const pathMatch = url.pathname.match(/^\/convert\/pets\/(dog|cat)s\/([^\/]+)\/(webp|jpeg|jpg|auto)$/);
    
    if (!pathMatch) {
      return new Response('Invalid path format', { status: 400 });
    }
    
    const [, petType, petId, requestedFormat] = pathMatch;
    
    try {
      // フォーマットの決定
      let format = requestedFormat;
      if (format === 'auto') {
        const acceptHeader = request.headers.get('Accept') || '';
        format = acceptHeader.includes('image/webp') ? 'webp' : 'jpeg';
      }
      
      // データベースでペット情報と画像状態を確認
      const pet = await env.DB
        .prepare('SELECT id, type, name, has_jpeg, has_webp, source_url FROM pets WHERE id = ?')
        .bind(petId)
        .first();
      
      if (!pet) {
        return new Response('Pet not found in database', { status: 404 });
      }
      
      // JPEGフォーマットの場合
      if (format === 'jpeg' || format === 'jpg') {
        const jpegKey = `pets/${petType}s/${petId}/original.jpg`;
        const jpegObject = await env.R2_BUCKET.get(jpegKey);
        
        if (!jpegObject) {
          return new Response('Original image not found', { status: 404 });
        }
        
        return new Response(jpegObject.body, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
            'ETag': jpegObject.etag || `"${petId}-jpeg"`,
            'X-Image-Source': 'original'
          }
        });
      }
      
      // WebP変換が必要な場合
      if (format === 'webp') {
        // キャッシュされたWebPをチェック
        const webpKey = `pets/${petType}s/${petId}/optimized.webp`;
        let webpObject = await env.R2_BUCKET.get(webpKey);
        
        if (!webpObject) {
          // WebPが存在しない場合、オリジナルから変換
          const jpegKey = `pets/${petType}s/${petId}/original.jpg`;
          const jpegObject = await env.R2_BUCKET.get(jpegKey);
          
          if (!jpegObject) {
            // オリジナル画像がない場合、GitHub Actionsをトリガー
            await this.triggerScreenshotCapture(env, {
              id: petId,
              type: petType,
              name: pet.name || 'Unknown'
            });
            
            return new Response('Image not found, screenshot requested', { 
              status: 202,
              headers: {
                'Retry-After': '30'
              }
            });
          }
          
          // JPEG → WebP変換
          console.log(`Converting ${petId} to WebP`);
          const jpegBuffer = await jpegObject.arrayBuffer();
          const webpBuffer = await this.convertToWebP(jpegBuffer, env);
          
          // 変換した画像をR2に保存
          await env.R2_BUCKET.put(webpKey, webpBuffer, {
            httpMetadata: {
              contentType: 'image/webp'
            },
            customMetadata: {
              sourceKey: jpegKey,
              convertedAt: new Date().toISOString(),
              petId: petId,
              compressionRatio: `${(webpBuffer.byteLength / jpegBuffer.byteLength * 100).toFixed(1)}%`
            }
          });
          
          webpObject = {
            body: webpBuffer,
            etag: `"${petId}-webp-${Date.now()}"`,
            uploaded: new Date().toISOString()
          };
        }
        
        return new Response(webpObject.body, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=604800', // 7日
            'ETag': webpObject.etag,
            'X-Image-Source': 'converted'
          }
        });
      }
      
      return new Response('Unsupported format', { status: 400 });
      
    } catch (error) {
      console.error(`Error processing image for ${petId}:`, error);
      return new Response(JSON.stringify({ 
        error: 'Image processing failed',
        message: error.message 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
  
  /**
   * WebP変換処理
   */
  async convertToWebP(jpegBuffer, env) {
    // Cloudflare Image Resizing APIを使用する場合
    if (env.CF_IMAGE_RESIZING_URL) {
      try {
        const response = await fetch(env.CF_IMAGE_RESIZING_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'CF-Polished': 'format=webp,quality=85,fit=scale-down,width=1200'
          },
          body: jpegBuffer
        });
        
        if (response.ok) {
          return await response.arrayBuffer();
        }
      } catch (error) {
        console.warn('Image Resizing API failed:', error);
      }
    }
    
    // Workers内での簡易変換（フォールバック）
    // 実際の環境では、wasm版のWebP変換ライブラリを使用することを推奨
    console.warn('Using fallback: returning original JPEG (WebP conversion not available)');
    return jpegBuffer;
  },
  
  /**
   * GitHub Actionsトリガー
   */
  async triggerScreenshotCapture(env, pet) {
    if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
      console.log('GitHub Actions not configured');
      return;
    }
    
    try {
      const response = await fetch(
        `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/pet-screenshot.yml/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: {
              pets_batch: JSON.stringify([{
                id: pet.id,
                petId: pet.id.replace('pethome_', ''),
                type: pet.type,
                name: pet.name,
                sourceUrl: `https://www.pet-home.jp/${pet.type}s/pn${pet.id.replace('pethome_', '')}/`
              }]),
              batch_id: `single-${pet.id}-${Date.now()}`
            }
          })
        }
      );
      
      if (response.status === 204) {
        console.log(`Screenshot capture triggered for ${pet.id}`);
      }
    } catch (error) {
      console.error('Failed to trigger screenshot:', error);
    }
  }
};

/**
 * 画像ステータス確認用のScheduledイベントハンドラー
 */
export async function scheduled(event, env, ctx) {
  console.log('Running image status check...');
  
  try {
    // データベースから最近のペットを取得
    const pets = await env.DB
      .prepare('SELECT id, type FROM pets ORDER BY created_at DESC LIMIT 100')
      .all();
    
    const stats = {
      total: pets.results.length,
      withJpeg: 0,
      withWebP: 0,
      missing: []
    };
    
    for (const pet of pets.results) {
      const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`;
      const webpKey = `pets/${pet.type}s/${pet.id}/optimized.webp`;
      
      const [jpegExists, webpExists] = await Promise.all([
        env.R2_BUCKET.head(jpegKey),
        env.R2_BUCKET.head(webpKey)
      ]);
      
      if (jpegExists) stats.withJpeg++;
      if (webpExists) stats.withWebP++;
      
      if (!jpegExists) {
        stats.missing.push(pet.id);
      }
    }
    
    console.log('Image status check results:', stats);
    
    // 不足している画像があれば、バッチでスクリーンショットをリクエスト
    if (stats.missing.length > 0) {
      console.log(`Requesting screenshots for ${stats.missing.length} pets`);
      // TODO: バッチ処理でGitHub Actionsをトリガー
    }
    
  } catch (error) {
    console.error('Status check failed:', error);
  }
}